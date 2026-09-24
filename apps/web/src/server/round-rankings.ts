import { Prisma } from "@prisma/client";
import { calculateRoundScore, rankTeams, type PlayerScoreStatus } from "../../../../packages/domain/round-scoring";
import { db } from "./db";
import { requireFantasyCompetition } from "./fantasy-availability";
import { cached, cacheTags, invalidateCache, measured, privateCacheKey } from "./performance";
import { enqueuePushEvent, wakePushWorker } from "./push-outbox";
import { appendLeagueEvent } from "./social-league";

export const ROUND_RANKING_SCHEMA_VERSION = "fantasy-round-ranking-api.v1";
export class RoundRankingError extends Error { constructor(public code: string, public status = 409) { super(code); } }
const enabled = () => process.env.FANTASY_ROUND_SCORING_ENABLED !== "false";

export async function recomputeRoundRankings(competitionSeasonId: string, roundNumber: number) {
  if (!enabled()) throw new RoundRankingError("FEATURE_DISABLED");
  if (!competitionSeasonId || !Number.isInteger(roundNumber) || roundNumber < 1) throw new RoundRankingError("INVALID_INPUT", 422);
  return measured("publish", () => db.$transaction(async (tx) => {
    await requireFantasyCompetition(tx, competitionSeasonId);
    const ruleSet = await tx.fantasyScoringRuleSet.findFirst({ where: { competitionSeasonId, status: "ACTIVE" }, orderBy: { publishedAt: "desc" } });
    if (!ruleSet) throw new RoundRankingError("RULESET_UNAVAILABLE");
    const games = await tx.game.findMany({ where: { competitionSeasonId, roundNumber, syncStatus: "active" }, select: { id: true, status: true } });
    const roundReady = games.length > 0 && games.every((game) => game.status === "finished");
    const lineups = await tx.fantasyLineup.findMany({ where: { roundNumber, status: "LOCKED", supersededAt: null, fantasyTeam: { competitionSeasonId } },
      include: { fantasyTeam: true, slots: { where: { role: "STARTER" }, orderBy: { ordinal: "asc" }, include: { playerRegistration: { select: { playerId: true } } } } } });
    const scores = await tx.fantasyPlayerGameScore.findMany({ where: { ruleSetId: ruleSet.id, game: { competitionSeasonId, roundNumber } }, orderBy: { createdAt: "desc" } });
    const latest = new Map<string, typeof scores[number]>();
    for (const score of scores) { const key = `${score.playerId}:${score.gameId}`; if (!latest.has(key)) latest.set(key, score); }
    const now = new Date(); let published = 0; let provisional = 0;
    for (const lineup of lineups) {
      const calculation = calculateRoundScore({ fantasyTeamId: lineup.fantasyTeamId, leagueId: lineup.fantasyTeam.leagueId,
        createdAt: lineup.fantasyTeam.createdAt, lineupId: lineup.id, lineupRevision: lineup.revision,
        starters: lineup.slots.map((slot) => ({ playerRegistrationId: slot.playerRegistrationId, displayName: slot.displayNameSnapshot,
          scores: [...latest.values()].filter((score) => score.playerId === slot.playerRegistration.playerId).map((score) => ({ id: score.id,
            status: score.status as PlayerScoreStatus, points: score.normalizedFantasyPoints?.toString() ?? null, sourceStatsVersion: score.sourceStatsVersion.trim() })) })) });
      const status = roundReady && calculation.status === "PUBLISHED" ? "PUBLISHED" : "PROVISIONAL";
      const existing = await tx.fantasyRoundScore.findUnique({ where: { fantasyTeamId_roundNumber_inputRevision: { fantasyTeamId: lineup.fantasyTeamId, roundNumber, inputRevision: calculation.inputRevision } } });
      if (existing) { if (status === "PUBLISHED") published++; else provisional++; continue; }
      const current = await tx.fantasyRoundScore.findFirst({ where: { fantasyTeamId: lineup.fantasyTeamId, roundNumber, supersededAt: null }, orderBy: { revision: "desc" } });
      if (current) await tx.fantasyRoundScore.update({ where: { id: current.id }, data: { supersededAt: now } });
      const roundScore = await tx.fantasyRoundScore.create({ data: { fantasyTeamId: lineup.fantasyTeamId, leagueId: lineup.fantasyTeam.leagueId,
        competitionSeasonId, roundNumber, revision: (current?.revision ?? 0) + 1, lineupId: lineup.id, ruleSetId: ruleSet.id,
        inputRevision: calculation.inputRevision, status, points: status === "PUBLISHED" ? calculation.points : null,
        publishedAt: status === "PUBLISHED" ? now : null, breakdown: { starters: calculation.contributions } as unknown as Prisma.InputJsonValue } });
      if (status === "PUBLISHED") await enqueuePushEvent(tx,{userProfileId:lineup.fantasyTeam.userProfileId,leagueId:lineup.fantasyTeam.leagueId,
        intent:"ROUND_RESULT",eventKey:`round-result:${lineup.fantasyTeam.leagueId}:${roundNumber}:${roundScore.revision}:${lineup.fantasyTeamId}`,
        title:"Resultado de jornada",body:`Tu resultado de la jornada ${roundNumber} ya está disponible.`,destination:"/app/jornada"});
      if (status === "PUBLISHED") published++; else provisional++;
    }
    await rebuildTotals(tx, competitionSeasonId);
    const affectedLeagueIds=[...new Set(lineups.map((lineup) => lineup.fantasyTeam.leagueId))];
    if(published)for(const leagueId of affectedLeagueIds)await publishSocialRound(tx,leagueId,roundNumber);
    return { roundNumber, teams: lineups.length, published, provisional, affectedLeagueIds };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 10_000,
    timeout: 30_000,
  })).then(({ affectedLeagueIds, ...result }) => { for (const leagueId of affectedLeagueIds) invalidateCache(cacheTags({ leagueId, roundNumber })); invalidateCache(cacheTags({ leagueId: competitionSeasonId, roundNumber })); if(result.published)void wakePushWorker(); return result; });
}

async function publishSocialRound(tx:Prisma.TransactionClient,leagueId:string,roundNumber:number){
  const scores=await tx.fantasyRoundScore.findMany({where:{leagueId,roundNumber,status:"PUBLISHED",supersededAt:null},include:{fantasyTeam:{include:{userProfile:true}}},orderBy:[{points:"desc"},{fantasyTeamId:"asc"}]});
  if(!scores.length)return;
  const revision=Math.max(...scores.map(score=>score.revision));
  await appendLeagueEvent(tx,{leagueId,type:"ROUND_PUBLISHED",sourceType:"ROUND_REVISION",sourceId:`${roundNumber}:${revision}`,payload:{affectedName:`Jornada ${roundNumber}`,revision,destination:`/app/ligas/${leagueId}`}});
  const best=Number(scores[0].points),worst=Number(scores.at(-1)!.points);
  const groups=[{type:"ROUND_MVP",label:"MVP de jornada",value:best,recipients:scores.filter(score=>Number(score.points)===best)},{type:"ROUND_LAST_PLACE",label:"Último de la jornada",value:worst,recipients:scores.filter(score=>Number(score.points)===worst)}];
  for(const group of groups){
    await tx.leagueAchievementAward.updateMany({where:{leagueId,achievementType:group.type,roundNumber,status:"ACTIVE",revision:{lt:revision}},data:{status:"REVOKED",revokedAt:new Date()}});
    for(const recipient of group.recipients){
      const award=await tx.leagueAchievementAward.upsert({where:{leagueId_achievementType_userProfileId_roundNumber_revision:{leagueId,achievementType:group.type,userProfileId:recipient.fantasyTeam.userProfileId,roundNumber,revision}},create:{leagueId,userProfileId:recipient.fantasyTeam.userProfileId,achievementType:group.type,ruleVersion:"trophy-icons.v1",roundNumber,revision,inputs:{score:group.value,tie:group.recipients.length>1,scoreIds:group.recipients.map(item=>item.id)}},update:{status:"ACTIVE",revokedAt:null}});
      await appendLeagueEvent(tx,{leagueId,type:group.type==="ROUND_MVP"?"ROUND_WINNER":"ACHIEVEMENT_EARNED",actorProfileId:recipient.fantasyTeam.userProfileId,sourceType:"ACHIEVEMENT_AWARD",sourceId:award.id,payload:{affectedName:group.label,magnitude:group.value,unit:"points",revision,destination:`/app/ligas/${leagueId}?tab=members`}});
    }
  }
}

type Tx = Prisma.TransactionClient;
async function rebuildTotals(tx: Tx, competitionSeasonId: string) {
  const teams = await tx.fantasyTeam.findMany({ where: { competitionSeasonId }, select: { id: true, leagueId: true, createdAt: true } });
  const rows = await tx.fantasyRoundScore.findMany({ where: { competitionSeasonId, status: "PUBLISHED", supersededAt: null }, orderBy: { roundNumber: "asc" } });
  const values = teams.map((team) => { const own = rows.filter((row) => row.fantasyTeamId === team.id); const last = own.at(-1);
    return { fantasyTeamId: team.id, leagueId: team.leagueId, createdAt: team.createdAt,
      totalPoints: own.reduce((sum, row) => sum + Number(row.points), 0), lastRoundPoints: Number(last?.points ?? 0),
      bestRoundPoints: Math.max(0, ...own.map((row) => Number(row.points))), lastRoundNumber: last?.roundNumber ?? null }; });
  const global = rankTeams(values); const byLeague = new Map<string, ReturnType<typeof rankTeams>>();
  for (const leagueId of new Set(values.map((item) => item.leagueId))) byLeague.set(leagueId, rankTeams(values.filter((item) => item.leagueId === leagueId)));
  const latestRound = Math.max(0, ...rows.map((row) => row.roundNumber));
  const previousValues = teams.map((team) => { const own = rows.filter((row) => row.fantasyTeamId === team.id && row.roundNumber < latestRound); const last = own.at(-1);
    return { fantasyTeamId: team.id, leagueId: team.leagueId, createdAt: team.createdAt, totalPoints: own.reduce((sum, row) => sum + Number(row.points), 0),
      lastRoundPoints: Number(last?.points ?? 0), bestRoundPoints: Math.max(0, ...own.map((row) => Number(row.points))) }; });
  const previousGlobal = latestRound ? rankTeams(previousValues) : [];
  const previousByLeague = new Map<string, ReturnType<typeof rankTeams>>();
  for (const leagueId of new Set(previousValues.map((item) => item.leagueId))) previousByLeague.set(leagueId, rankTeams(previousValues.filter((item) => item.leagueId === leagueId)));
  for (const value of values) {
    const globalPosition = global.find((item) => item.fantasyTeamId === value.fantasyTeamId)!.position;
    const leaguePosition = byLeague.get(value.leagueId)!.find((item) => item.fantasyTeamId === value.fantasyTeamId)!.position;
    const previousGlobalPosition = previousGlobal.find((item) => item.fantasyTeamId === value.fantasyTeamId)?.position ?? null;
    const previousLeaguePosition = previousByLeague.get(value.leagueId)?.find((item) => item.fantasyTeamId === value.fantasyTeamId)?.position ?? null;
    await tx.fantasyTeamTotal.upsert({ where: { fantasyTeamId: value.fantasyTeamId }, create: { fantasyTeamId: value.fantasyTeamId, leagueId: value.leagueId,
      competitionSeasonId, totalPoints: value.totalPoints, lastRoundNumber: value.lastRoundNumber, lastRoundPoints: value.lastRoundPoints,
      bestRoundPoints: value.bestRoundPoints, globalPosition, leaguePosition, previousGlobalPosition, previousLeaguePosition }, update: { totalPoints: value.totalPoints, lastRoundNumber: value.lastRoundNumber,
      lastRoundPoints: value.lastRoundPoints, bestRoundPoints: value.bestRoundPoints, previousGlobalPosition,
      previousLeaguePosition, globalPosition, leaguePosition } }); }
}

async function loadRanking(actorAuthUserId: string, params: { competitionSeasonId: string; leagueId?: string; roundNumber?: number }) {
  if (!params.competitionSeasonId) throw new RoundRankingError("COMPETITION_SEASON_REQUIRED", 400);
  const profile = await db.userProfile.findUnique({ where: { authUserId: actorAuthUserId }, select: { id: true } });
  if (!profile) throw new RoundRankingError("AUTH_REQUIRED", 401);
  if (params.leagueId) { const member = await db.leagueMembership.findFirst({ where: { leagueId: params.leagueId, userProfileId: profile.id, status: "ACTIVE" } });
    if (!member) throw new RoundRankingError("LEAGUE_NOT_FOUND", 404); }
  const totals = await db.fantasyTeamTotal.findMany({ where: { competitionSeasonId: params.competitionSeasonId, leagueId: params.leagueId,
    ...(params.leagueId ? { fantasyTeam: { userProfile: { leagueMemberships: { some: { leagueId: params.leagueId, status: "ACTIVE" } } } } } : {}) },
    include: { fantasyTeam: { include: { userProfile: { select: { username: true, displayName: true } } } } }, orderBy: params.leagueId ? { leaguePosition: "asc" } : { globalPosition: "asc" } });
  const roundScores = params.roundNumber === undefined ? [] : await db.fantasyRoundScore.findMany({ where: { competitionSeasonId: params.competitionSeasonId,
    leagueId: params.leagueId, roundNumber: params.roundNumber, supersededAt: null }, select: { fantasyTeamId: true, revision: true, status: true, points: true, breakdown: true } });
  const byTeam = new Map(roundScores.map((row) => [row.fantasyTeamId, row]));
  return totals.map((total) => { const round = byTeam.get(total.fantasyTeamId); const position = params.leagueId ? total.leaguePosition : total.globalPosition;
    const previous = params.leagueId ? total.previousLeaguePosition : total.previousGlobalPosition;
    return { fantasyTeamId: total.fantasyTeamId, username: total.fantasyTeam.userProfile.username, displayName: total.fantasyTeam.userProfile.displayName, isMe: total.fantasyTeam.userProfileId === profile.id, totalPoints: total.totalPoints.toString(),
      position, variation: position && previous ? previous - position : null, lastRoundNumber: total.lastRoundNumber,
      lastValidRevisionAt: total.updatedAt.toISOString(), isRecomputing: round?.status === "PROVISIONAL",
      round: round ? { revision: round.revision, status: round.status, points: round.points?.toString() ?? null, breakdown: round.breakdown } : null }; });
}

export async function getRanking(actorAuthUserId: string, params: { competitionSeasonId: string; leagueId?: string; roundNumber?: number }) {
  if (!params.competitionSeasonId) throw new RoundRankingError("COMPETITION_SEASON_REQUIRED", 400);
  const season = await db.competitionSeason.findFirst({ where: { id: params.competitionSeasonId, fantasyEnabled: true }, select: { id: true } });
  if (!season) throw new RoundRankingError("COMPETITION_DISABLED", 409);
  const profile = await db.userProfile.findUnique({ where: { authUserId: actorAuthUserId }, select: { id: true } });
  if (!profile) throw new RoundRankingError("AUTH_REQUIRED", 401);
  if (params.leagueId) {
    const member = await db.leagueMembership.findFirst({ where: { leagueId: params.leagueId, userProfileId: profile.id, status: "ACTIVE" }, select: { leagueId: true } });
    if (!member) throw new RoundRankingError("LEAGUE_NOT_FOUND", 404);
  }
  const leagueScope=params.leagueId??params.competitionSeasonId;
  return cached("ranking",privateCacheKey("ranking",{actorAuthUserId,leagueId:leagueScope,revision:params.roundNumber??"latest",variant:params.competitionSeasonId}),cacheTags({leagueId:leagueScope,roundNumber:params.roundNumber}),()=>loadRanking(actorAuthUserId,params));
}
