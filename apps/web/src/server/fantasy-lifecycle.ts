import { db } from "./db";
import { recomputeRound } from "./fantasy-scoring";
import { recomputePlayerPrices } from "./player-pricing";

export type FantasyLifecycleRound = {
  roundNumber: number;
  scoresProcessed: number;
  pricesUpdated: number;
};

type LifecycleGame = { roundNumber: number | null; status: string; hasStatistics: boolean; statsSyncStatus: string };

export function eligibleRoundNumbers(games: LifecycleGame[]) {
  const grouped = new Map<number, LifecycleGame[]>();
  for (const game of games) {
    if (game.roundNumber === null) continue;
    grouped.set(game.roundNumber, [...(grouped.get(game.roundNumber) ?? []), game]);
  }
  return [...grouped.entries()]
    .filter(([, rows]) => rows.length > 0 && rows.every((game) =>
      game.status === "finished" && game.hasStatistics && game.statsSyncStatus === "stats_final"))
    .map(([roundNumber]) => roundNumber)
    .sort((a, b) => a - b);
}

export async function advanceFantasyLifecycle(competitionSeasonId: string) {
  if (!competitionSeasonId) throw new Error("COMPETITION_SEASON_REQUIRED");
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

  const processed: FantasyLifecycleRound[] = [];
  for (const roundNumber of eligible) {
    const scoresProcessed = await recomputeRound(competitionSeasonId, roundNumber, ruleSet.id);
    const prices = await recomputePlayerPrices(competitionSeasonId, roundNumber);
    processed.push({ roundNumber, scoresProcessed, pricesUpdated: prices.updated });
  }
  return { competitionSeasonId, eligibleRounds: eligible.length, processed, skipped: null };
}
