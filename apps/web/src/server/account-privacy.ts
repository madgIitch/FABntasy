import { randomUUID } from "node:crypto";
import { db } from "./db";

export const ACCOUNT_EXPORT_VERSION = "canastio-account-export.v1";

export async function exportOwnAccount(authUserId: string) {
  const profile = await db.userProfile.findUnique({
    where: { authUserId },
    select: {
      username: true, displayName: true, createdAt: true, discoverableByUsername: true,
      leagueMemberships: { select: { role: true, status: true, joinedAt: true, league: { select: { id: true, name: true } } } },
      fantasyTeams: { select: { id: true, name: true, balanceCredits: true, version: true, leagueId: true, competitionSeasonId: true, createdAt: true } },
      notificationPreferences: { select: { intent: true, enabled: true } },
    },
  });
  if (!profile) return null;
  return {
    schemaVersion: ACCOUNT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: { ...profile, fantasyTeams: profile.fantasyTeams.map((team) => ({ ...team, balanceCredits: team.balanceCredits?.toString() ?? null })) },
  };
}

export async function anonymizeOwnAccount(authUserId: string) {
  return db.$transaction(async (tx) => {
    const profile = await tx.userProfile.findUnique({ where: { authUserId }, select: { id: true, avatarPath: true } });
    if (!profile) return null;
    const owned = await tx.fantasyLeague.findMany({ where: { ownerProfileId: profile.id, status: "ACTIVE" }, select: { id: true } });
    for (const league of owned) {
      const successor = await tx.leagueMembership.findFirst({ where: { leagueId: league.id, userProfileId: { not: profile.id }, status: "ACTIVE" }, orderBy: { joinedAt: "asc" }, select: { id: true, userProfileId: true } });
      if (successor) {
        await tx.fantasyLeague.update({ where: { id: league.id }, data: { ownerProfileId: successor.userProfileId } });
        await tx.leagueMembership.update({ where: { id: successor.id }, data: { role: "OWNER" } });
      }
    }
    await tx.pushSubscription.deleteMany({ where: { userProfileId: profile.id } });
    await tx.notificationPreference.deleteMany({ where: { userProfileId: profile.id } });
    await tx.userProfile.update({ where: { id: profile.id }, data: { authUserId: randomUUID(), username: null, displayName: null, avatarPath: null, discoverableByUsername: false, deletedAt: new Date() } });
    return { avatarPath: profile.avatarPath };
  });
}
