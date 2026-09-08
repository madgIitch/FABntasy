import { Prisma } from "@prisma/client";
import { db } from "./db";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export class ProfileServiceError extends Error {
  constructor(public code: "INVALID_USERNAME" | "USERNAME_TAKEN" | "PROFILE_NOT_FOUND") { super(code); }
}

export async function restoreUsernameFromAuthMetadata(authUserId: string, metadataUsername: unknown) {
  if (typeof metadataUsername !== "string") return null;
  const username = normalizeUsername(metadataUsername);
  if (!USERNAME_PATTERN.test(username)) return null;
  try {
    return await db.userProfile.update({ where: { authUserId }, data: { username } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2025")) return null;
    throw error;
  }
}

export async function updateUserProfile(authUserId: string, input: { username: string; displayName: string | null; avatarPath?: string | null }) {
  const username = normalizeUsername(input.username);
  if (!USERNAME_PATTERN.test(username)) throw new ProfileServiceError("INVALID_USERNAME");
  try {
    return await db.userProfile.update({
      where: { authUserId },
      data: { username, displayName: input.displayName, ...(input.avatarPath === undefined ? {} : { avatarPath: input.avatarPath }) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ProfileServiceError("USERNAME_TAKEN");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new ProfileServiceError("PROFILE_NOT_FOUND");
    throw error;
  }
}

export async function getUserProfileOverview(authUserId: string) {
  const profile = await db.userProfile.findUnique({
    where: { authUserId },
    include: {
      leagueMemberships: {
        where: { status: "ACTIVE", league: { status: "ACTIVE", legacyTeamId: null } },
        orderBy: { joinedAt: "desc" },
        include: { league: { include: { memberships: { where: { status: "ACTIVE" }, select: { id: true } } } } },
      },
      fantasyTeams: { include: { total: true } },
    },
  });
  if (!profile) throw new ProfileServiceError("PROFILE_NOT_FOUND");
  const teamsByLeague = new Map(profile.fantasyTeams.map((team) => [team.leagueId, team]));
  const publishedTotals = profile.fantasyTeams.map((team) => team.total).filter((total): total is NonNullable<typeof total> => Boolean(total?.lastRoundNumber));
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    avatarPath: profile.avatarPath,
    leagueCount: profile.leagueMemberships.length,
    totalPoints: publishedTotals.length ? publishedTotals.reduce((sum, total) => sum + Number(total.totalPoints), 0) : null,
    leagues: profile.leagueMemberships.map(({ league }) => ({
      id: league.id,
      name: league.name,
      memberCount: league.memberships.length,
      hasTeam: teamsByLeague.has(league.id),
      teamName: teamsByLeague.get(league.id)?.name ?? null,
    })),
  };
}
