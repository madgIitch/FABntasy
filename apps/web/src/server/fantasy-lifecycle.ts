import { db } from "./db";
import { recomputeRound } from "./fantasy-scoring";
import { recomputePlayerPrices } from "./player-pricing";

export type FantasyLifecycleRound = {
  roundNumber: number;
  scoresProcessed: number;
  pricesUpdated: number;
  status: "PROVISIONAL" | "PUBLISHED";
};

type LifecycleGame = { roundNumber: number | null; status: string; hasStatistics: boolean; statsSyncStatus: string };

export function eligibleRoundNumbers(games: LifecycleGame[]) {
  const grouped = new Map<number, LifecycleGame[]>();
  for (const game of games) {
    if (game.roundNumber === null) continue;
    grouped.set(game.roundNumber, [...(grouped.get(game.roundNumber) ?? []), game]);
  }
  return [...grouped.entries()]
    .filter(([, rows]) => rows.some((game) =>
      game.status === "finished" && game.hasStatistics && game.statsSyncStatus === "stats_final"))
    .map(([roundNumber]) => roundNumber)
    .sort((a, b) => a - b);
}

export function provisionalRoundNumbers(games: LifecycleGame[]) {
  const grouped = new Map<number, LifecycleGame[]>();
  for (const game of games) {
    if (game.roundNumber === null) continue;
    grouped.set(game.roundNumber, [...(grouped.get(game.roundNumber) ?? []), game]);
  }
  return [...grouped.entries()]
    .filter(([, rows]) => rows.some((game) => game.status === "live" && game.statsSyncStatus === "partial"))
    .map(([roundNumber]) => roundNumber)
    .sort((a, b) => a - b);
}

export async function advanceFantasyLifecycle(competitionSeasonId: string) {
  if (!competitionSeasonId) throw new Error("COMPETITION_SEASON_REQUIRED");
  const season = await db.competitionSeason.findUnique({ where: { id: competitionSeasonId }, select: { fantasyEnabled: true } });
  if (!season?.fantasyEnabled) return { competitionSeasonId, eligibleRounds: 0, processed: [], skipped: "COMPETITION_DISABLED" as const };
  const [games, ruleSet] = await Promise.all([
    db.game.findMany({
      where: { competitionSeasonId, syncStatus: "active", roundNumber: { not: null } },
      select: { roundNumber: true, status: true, hasStatistics: true, statsSyncStatus: true },
    }),
    db.fantasyScoringRuleSet.findFirst({
      where: { competitionSeasonId, status: "ACTIVE" },
      orderBy: { publishedAt: "desc" },
      select: { id: true },
    }),
  ]);
  if (!ruleSet) return { competitionSeasonId, eligibleRounds: 0, processed: [], skipped: "RULESET_UNAVAILABLE" as const };

  const eligible = eligibleRoundNumbers(games);
  const provisional = provisionalRoundNumbers(games).filter((round) => !eligible.includes(round));

  const processed: FantasyLifecycleRound[] = [];
  for (const roundNumber of [...provisional, ...eligible]) {
    const scoresProcessed = await recomputeRound(competitionSeasonId, roundNumber, ruleSet.id);
    const isFinal = eligible.includes(roundNumber);
    const prices = isFinal ? await recomputePlayerPrices(competitionSeasonId, roundNumber) : { updated: 0 };
    processed.push({ roundNumber, scoresProcessed, pricesUpdated: prices.updated, status: isFinal ? "PUBLISHED" : "PROVISIONAL" });
  }
  return { competitionSeasonId, eligibleRounds: eligible.length, provisionalRounds: provisional.length, processed, skipped: null };
}
