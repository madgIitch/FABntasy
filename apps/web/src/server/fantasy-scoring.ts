import { Prisma, type PlayerGameStat } from "@prisma/client";
import {
  NATIONAL_V1, PROVINCIAL_V1, buildNormalizationPopulation, calculateFantasyScore,
  sourceStatsVersion, type CanonicalBoxscoreSnapshot, type FantasyBreakdown, type FantasyRuleSet,
} from "../../../../packages/domain/fantasy-scoring";
import { db } from "./db";

export interface FantasyScoreDto {
  status: string;
  errorCode: string | null;
  playerId: string;
  gameId: string;
  competitionId: string;
  competitionSeasonId: string;
  rawScore: string | null;
  normalizedFantasyPoints: string | null;
  rulesetId: string;
  rulesetVersion: string;
  sourceStatsVersion: string;
  recalculated: boolean;
  breakdown: FantasyBreakdown;
}

type HydratedStat = PlayerGameStat & {
  game: { competitionSeasonId: string; roundNumber: number | null; competitionSeason: { competitionId: string } };
  playerRegistration: { playerId: string };
};

export function snapshotFromStat(stat: HydratedStat): CanonicalBoxscoreSnapshot {
  const value = (input: Prisma.Decimal | number | null) => input == null ? null : String(input);
  return {
    schemaVersion: "player-game-stat.v1", playerGameStatId: stat.id, playerId: stat.playerRegistration.playerId,
    gameId: stat.gameId, competitionId: stat.game.competitionSeason.competitionId,
    competitionSeasonId: stat.game.competitionSeasonId, roundNumber: stat.game.roundNumber,
    stats: {
      minutesPlayed: value(stat.minutesPlayed), points: value(stat.points), freeThrowsMade: value(stat.freeThrowsMade),
      freeThrowsAttempted: value(stat.freeThrowsAttempted), twoPointersMade: value(stat.twoPointersMade), twoPointersAttempted: value(stat.twoPointersAttempted),
      threePointersMade: value(stat.threePointersMade), threePointersAttempted: value(stat.threePointersAttempted), rebounds: value(stat.rebounds),
      assists: value(stat.assists), steals: value(stat.steals), turnovers: value(stat.turnovers), blocks: value(stat.blocks), foulsCommitted: value(stat.foulsCommitted),
    },
  };
}

export async function publishOfficialV1(competitionSeasonId: string, type: FantasyRuleSet["calculationType"]) {
  const definition = type === "PROVINCIAL" ? PROVINCIAL_V1 : NATIONAL_V1;
  return db.fantasyScoringRuleSet.upsert({
    where: { competitionSeasonId_calculationType_identifier_version: { competitionSeasonId, calculationType: type, identifier: definition.identifier, version: definition.version } },
    create: { competitionSeasonId, calculationType: type, identifier: definition.identifier, version: definition.version, definition: definition as unknown as Prisma.InputJsonValue, status: "INACTIVE", publishedAt: new Date() },
    update: {},
  });
}

export async function activateRuleSet(ruleSetId: string, actor: string, reason: string) {
  if (!actor.trim() || !reason.trim()) throw new Error("Actor and reason are required for the audit trail");
  return db.$transaction(async (tx) => {
    const target = await tx.fantasyScoringRuleSet.findUniqueOrThrow({ where: { id: ruleSetId } });
    if (!target.publishedAt || target.status === "RETIRED") throw new Error("Only a published, non-retired ruleset can be activated");
    const wasActivated = await tx.fantasyRuleSetActivation.count({ where: { ruleSetId, action: { in: ["ACTIVATED", "REACTIVATED"] } } });
    await tx.fantasyScoringRuleSet.updateMany({ where: { competitionSeasonId: target.competitionSeasonId, calculationType: target.calculationType, status: "ACTIVE" }, data: { status: "INACTIVE" } });
    await tx.fantasyScoringRuleSet.update({ where: { id: ruleSetId }, data: { status: "ACTIVE" } });
    return tx.fantasyRuleSetActivation.create({ data: { competitionSeasonId: target.competitionSeasonId, ruleSetId, action: wasActivated ? "REACTIVATED" : "ACTIVATED", actor, reason } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function retireRuleSet(ruleSetId: string, actor: string, reason: string) {
  return db.$transaction(async (tx) => {
    const target = await tx.fantasyScoringRuleSet.update({ where: { id: ruleSetId }, data: { status: "RETIRED", retiredAt: new Date() } });
    await tx.fantasyRuleSetActivation.create({ data: { competitionSeasonId: target.competitionSeasonId, ruleSetId, action: "RETIRED", actor, reason } });
  });
}

export async function recomputeRound(competitionSeasonId: string, roundNumber: number, ruleSetId: string) {
  return retrySerializable(() => db.$transaction(async (tx) => {
    const storedRuleSet = await tx.fantasyScoringRuleSet.findUniqueOrThrow({ where: { id: ruleSetId } });
    if (storedRuleSet.competitionSeasonId !== competitionSeasonId || !storedRuleSet.publishedAt) throw new Error("INVALID_RULESET");
    const ruleset = storedRuleSet.definition as unknown as FantasyRuleSet;
    const stats = await tx.playerGameStat.findMany({ where: { game: { competitionSeasonId, roundNumber } }, include: { game: { include: { competitionSeason: true } }, playerRegistration: true } });
    const snapshots = stats.map(snapshotFromStat);
    const preliminaries = snapshots.map((snapshot) => calculateFantasyScore(snapshot, ruleset, null));
    const eligibleRaw = preliminaries.filter((result) => result.status === "PENDING" && result.breakdown.finalScore.unroundedRaw !== null).map((result) => result.breakdown.finalScore.unroundedRaw!);
    const population = buildNormalizationPopulation(eligibleRaw);
    const rows = snapshots.map((snapshot) => ({ snapshot, result: calculateFantasyScore(snapshot, ruleset, population) }));
    await tx.fantasyPlayerGameScore.createMany({ data: rows.map(({ snapshot, result }) => ({
      playerGameStatId: snapshot.playerGameStatId, playerId: snapshot.playerId, gameId: snapshot.gameId,
      ruleSetId, ruleSetVersion: ruleset.version, sourceStatsVersion: sourceStatsVersion(snapshot), rawScore: result.rawScore,
      normalizedFantasyPoints: result.normalizedFantasyPoints, status: result.status, errorCode: result.errorCode,
      breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
    })), skipDuplicates: true });
    return rows.length;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function getFantasyScores(params: { playerId?: string; gameId?: string; rulesetId?: string; rulesetVersion?: string }): Promise<FantasyScoreDto[]> {
  if (!params.rulesetId && !params.rulesetVersion) throw new Error("RULESET_VERSION_REQUIRED");
  const scores = await db.fantasyPlayerGameScore.findMany({ where: {
    playerId: params.playerId, gameId: params.gameId, ruleSetId: params.rulesetId, ruleSetVersion: params.rulesetVersion,
  }, include: { game: { include: { competitionSeason: true } }, ruleSet: true }, orderBy: { createdAt: "desc" } });
  return scores.map((score) => ({
    status: score.status, errorCode: score.errorCode, playerId: score.playerId, gameId: score.gameId,
    competitionId: score.game.competitionSeason.competitionId, competitionSeasonId: score.game.competitionSeasonId,
    rawScore: score.rawScore?.toFixed(1) ?? null, normalizedFantasyPoints: score.normalizedFantasyPoints?.toFixed(1) ?? null,
    rulesetId: score.ruleSetId, rulesetVersion: score.ruleSetVersion, sourceStatsVersion: score.sourceStatsVersion.trim(),
    recalculated: score.ruleSet.status !== "ACTIVE" || scores.some((other) => other.id !== score.id && other.playerGameStatId === score.playerGameStatId),
    breakdown: score.breakdown as unknown as FantasyBreakdown,
  }));
}

async function retrySerializable<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (attempts > 1 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return retrySerializable(operation, attempts - 1);
    throw error;
  }
}
