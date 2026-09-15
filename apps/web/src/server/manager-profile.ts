import { TROPHY_ICONS, TROPHY_RULE_VERSION, calculateStreak, type TrophyType } from "../../../../packages/domain/manager-profile";
import { avatarUrl } from "../lib/avatar";
import { db } from "./db";
import { SocialLeagueError, getHeadToHead, type SocialActor } from "./social-league";

export async function managerContext(actor: SocialActor, leagueId: string, publicManagerId: string) {
  const actorProfile = await db.userProfile.findUnique({ where: { authUserId: actor.authUserId }, select: { id: true } });
  if (!actorProfile) throw new SocialLeagueError("AUTH_REQUIRED", 401);
  const actorMembership = await db.leagueMembership.findFirst({ where: { leagueId, userProfileId: actorProfile.id, status: "ACTIVE", league: { status: "ACTIVE" } } });
  const target = await db.leagueMembership.findFirst({
    where: { leagueId, status: "ACTIVE", userProfile: { username: publicManagerId } },
    include: { userProfile: true },
  });
  if (!actorMembership || !target) throw new SocialLeagueError("RESOURCE_NOT_FOUND", 404);
  return { actorProfileId: actorProfile.id, target };
}

export async function getManagerProfile(actor: SocialActor, leagueId: string, publicManagerId: string) {
  const context = await managerContext(actor, leagueId, publicManagerId);
  const league = await db.fantasyLeague.findUnique({
    where: { id: leagueId },
    include: { competitionSeason: { include: { competition: true, season: true } } },
  });
  const team = await db.fantasyTeam.findUnique({
    where: { userProfileId_leagueId: { userProfileId: context.target.userProfileId, leagueId } },
    include: { total: true, rosterSlots: { include: { playerRegistration: { include: { prices: { orderBy: { updatedAt: "desc" }, take: 1 } } } } } },
  });
  if (!league || !team) throw new SocialLeagueError("RESOURCE_NOT_FOUND", 404);
  const allScores = await db.fantasyRoundScore.findMany({ where: { leagueId, status: "PUBLISHED", supersededAt: null }, orderBy: [{ roundNumber: "desc" }, { revision: "desc" }] });
  const ownScores = allScores.filter((score) => score.fantasyTeamId === team.id);
  const maxByRound = new Map<number, number>();
  for (const score of allScores) maxByRound.set(score.roundNumber, Math.max(maxByRound.get(score.roundNumber) ?? Number.NEGATIVE_INFINITY, Number(score.points)));
  const streak = calculateStreak(ownScores.map((score) => ({ seasonId: score.competitionSeasonId, roundNumber: score.roundNumber, revision: score.revision, points: score.points === null ? null : Number(score.points), maxPoints: maxByRound.get(score.roundNumber) ?? null })));
  const persisted = await db.leagueAchievementAward.findMany({ where: { leagueId, userProfileId: team.userProfileId, status: "ACTIVE", achievementType: { in: Object.keys(TROPHY_ICONS) } }, orderBy: { awardedAt: "desc" } });
  const awards = persisted.map((award) => ({ type: award.achievementType as TrophyType, ruleVersion: award.ruleVersion, status: award.status, awardedAt: award.awardedAt.toISOString(), roundNumber: award.roundNumber, magnitude: Number((award.inputs as { score?: number })?.score ?? 0) || null, publicRevision: `J${award.roundNumber ?? 0}-R${award.revision}`, icon: TROPHY_ICONS[award.achievementType as TrophyType] }));
  if (team.total?.leaguePosition === 1) awards.unshift({ type: "CURRENT_LEAGUE_LEADER", ruleVersion: TROPHY_RULE_VERSION, status: "ACTIVE", awardedAt: team.total.updatedAt.toISOString(), roundNumber: null, magnitude: Number(team.total.totalPoints), publicRevision: `TOTAL-R${team.version}`, icon: TROPHY_ICONS.CURRENT_LEAGUE_LEADER });
  let rivalryAvailable = false;
  if (context.actorProfileId !== team.userProfileId) {
    const comparison = await getHeadToHead(actor, leagueId, context.actorProfileId, team.userProfileId);
    rivalryAvailable = comparison.comparable && Boolean(comparison.rivalry?.reason);
  }
  const rosterValue = team.rosterSlots.reduce((sum, slot) => sum + Number(slot.playerRegistration.prices[0]?.currentPrice ?? 0), 0);
  const publicName = context.target.userProfile.displayName?.trim() || `@${context.target.userProfile.username}`;
  return {
    profile: { name: publicName, username: `@${context.target.userProfile.username}`, avatarUrl: avatarUrl(context.target.userProfile.avatarPath), teamName: team.name, leagueName: league.name, competitionName: league.competitionSeason.name || `${league.competitionSeason.competition.name} · ${league.competitionSeason.season.name}` },
    metrics: { position: team.total?.leaguePosition ?? null, totalPoints: team.total ? Number(team.total.totalPoints) : null, rosterValue },
    streak,
    bestRound: ownScores.length ? Math.max(...ownScores.map((score) => Number(score.points))) : null,
    awards,
    history: ownScores.map((score) => ({ roundNumber: score.roundNumber, points: score.points === null ? null : Number(score.points), revision: score.revision, publishedAt: score.publishedAt?.toISOString() ?? null })),
    rivalryAvailable,
  };
}
