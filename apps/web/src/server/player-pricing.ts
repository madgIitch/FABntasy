import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PLAYER_PRICING_V1, calculatePriceCohort, type PricingPlayerInput, type RoundOutcome } from "../../../../packages/domain/player-pricing";
import { db } from "./db";

export type PlayerPriceDto = {
  playerRegistrationId: string; playerId: string; displayName: string; realTeamName: string;
  competitionSeasonId: string; algorithmVersion: string; status: string; currentPrice: number;
  previousPrice: number | null; changeCredits: number; changePercent: number | null;
  trend: "UP" | "DOWN" | "FLAT"; allTimeHigh: number; allTimeLow: number;
  roundNumber: number | null; updatedAt: string;
};

export async function recomputePlayerPrices(competitionSeasonId: string, roundNumber: number, algorithmVersion = PLAYER_PRICING_V1.version) {
  if (algorithmVersion !== PLAYER_PRICING_V1.version) throw new Error("UNSUPPORTED_ALGORITHM_VERSION");
  if (!Number.isSafeInteger(roundNumber) || roundNumber < 1) throw new Error("INVALID_ROUND_NUMBER");
  return retrySerializable(() => db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`player-pricing:${competitionSeasonId}:${algorithmVersion}`}))`);
    const registrations = await tx.playerRegistration.findMany({
      where: { competitionSeasonId },
      include: {
        player: true,
        teamRegistration: true,
        prices: {
          where: { algorithmVersion }, take: 1,
          include: { events: { where: { roundNumber: { lte: roundNumber } }, orderBy: [{ roundNumber: "desc" }, { createdAt: "desc" }] } },
        },
        stats: {
          where: { game: { roundNumber: { lte: roundNumber } } },
          include: { game: true, fantasyScores: { where: { ruleSet: { status: "ACTIVE" } }, orderBy: { createdAt: "desc" } } },
        },
      },
    });
    const games = await tx.game.findMany({ where: { competitionSeasonId, roundNumber }, select: { homeTeamId: true, awayTeamId: true, status: true } });
    const confirmedRounds = await tx.game.findMany({ where: { competitionSeasonId, roundNumber: { lte: roundNumber }, fantasyScores: { some: { status: { in: ["CALCULATED", "DNP"] } } } }, distinct: ["roundNumber"], select: { roundNumber: true } });
    const input: PricingPlayerInput[] = registrations.map((registration) => {
      const price = registration.prices[0];
      const priorSameRound = price?.events.find((event) => event.roundNumber === roundNumber);
      const currentPrice = priorSameRound ? Number(priorSameRound.previousPrice) : Number(price?.currentPrice ?? PLAYER_PRICING_V1.initialPrice);
      const scoresByGame = new Map<string, typeof registration.stats[number]["fantasyScores"][number]>();
      for (const stat of registration.stats) if (stat.fantasyScores[0]) scoresByGame.set(stat.gameId, stat.fantasyScores[0]);
      const performances = registration.stats.filter((stat) => (stat.game.roundNumber ?? 0) <= roundNumber)
        .sort((a, b) => (a.game.roundNumber ?? 0) - (b.game.roundNumber ?? 0))
        .flatMap((stat) => { const score = scoresByGame.get(stat.gameId); return score?.status === "CALCULATED" && score.normalizedFantasyPoints !== null ? [score.normalizedFantasyPoints.toString()] : []; });
      const teamId = registration.teamRegistration.teamId;
      const scheduled = games.some((game) => game.homeTeamId === teamId || game.awayTeamId === teamId);
      const roundStat = registration.stats.find((stat) => stat.game.roundNumber === roundNumber);
      const roundScore = roundStat ? scoresByGame.get(roundStat.gameId) : undefined;
      let outcome: RoundOutcome = "NO_SCHEDULED_GAME";
      if (scheduled && roundScore?.status === "DNP") outcome = "DNP";
      else if (roundScore?.status === "CALCULATED" && roundScore.normalizedFantasyPoints !== null) outcome = "PLAYED";
      const priorEvent = price?.events.find((event) => event.roundNumber < roundNumber);
      const priorDnp = priorEvent?.status === "DNP_ADJUSTMENT" ? priorEvent.dnpStreak : 0;
      return { playerRegistrationId: registration.id, currentPrice, performances, outcome, consecutiveDnp: outcome === "DNP" ? priorDnp + 1 : 0 };
    });
    const results = calculatePriceCohort(input, Math.max(1, confirmedRounds.length));
    const revision = inputRevision({ competitionSeasonId, roundNumber, algorithmVersion, input });
    for (const result of results) {
      const price = await tx.playerPrice.upsert({
        where: { playerRegistrationId_competitionSeasonId_algorithmVersion: { playerRegistrationId: result.playerRegistrationId, competitionSeasonId, algorithmVersion } },
        create: { playerRegistrationId: result.playerRegistrationId, competitionSeasonId, algorithmVersion, currentPrice: result.newPrice, status: result.status, lastRoundNumber: roundNumber, allTimeHigh: result.newPrice, allTimeLow: result.newPrice },
        update: { currentPrice: result.newPrice, status: result.status, lastRoundNumber: roundNumber,
          allTimeHigh: { set: Math.max(result.newPrice, Number(registrations.find((item) => item.id === result.playerRegistrationId)?.prices[0]?.allTimeHigh ?? result.newPrice)) },
          allTimeLow: { set: Math.min(result.newPrice, Number(registrations.find((item) => item.id === result.playerRegistrationId)?.prices[0]?.allTimeLow ?? result.newPrice)) } },
      });
      await tx.playerPriceEvent.createMany({ data: [{ playerPriceId: price.id, playerRegistrationId: result.playerRegistrationId, competitionSeasonId,
        roundNumber, algorithmVersion, inputRevision: revision, status: result.status, previousPrice: result.previousPrice, targetPrice: result.targetPrice,
        newPrice: result.newPrice, recentForm: result.recentForm, seasonAverage: result.seasonAverage, marketRating: result.marketRating,
        percentile: result.percentile, dnpStreak: result.dnpStreak, inputSnapshot: input.find((item) => item.playerRegistrationId === result.playerRegistrationId)! as unknown as Prisma.InputJsonValue }], skipDuplicates: true });
    }
    return { competitionSeasonId, roundNumber, algorithmVersion, inputRevision: revision, updated: results.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function backfillPlayerPrices(competitionSeasonId: string, throughRound: number, algorithmVersion = PLAYER_PRICING_V1.version) {
  if (!Number.isSafeInteger(throughRound) || throughRound < 1) throw new Error("INVALID_ROUND_NUMBER");
  const runs = [];
  for (let roundNumber = 1; roundNumber <= throughRound; roundNumber += 1) runs.push(await recomputePlayerPrices(competitionSeasonId, roundNumber, algorithmVersion));
  return runs;
}

export async function getPlayerPrices(params: { competitionSeasonId: string; playerRegistrationId?: string; algorithmVersion?: string }): Promise<PlayerPriceDto[]> {
  const algorithmVersion = params.algorithmVersion ?? PLAYER_PRICING_V1.version;
  const prices = await db.playerPrice.findMany({ where: { competitionSeasonId: params.competitionSeasonId, playerRegistrationId: params.playerRegistrationId, algorithmVersion },
    include: { playerRegistration: { include: { player: true, teamRegistration: { include: { team: true } } } }, events: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: [{ currentPrice: "desc" }, { playerRegistration: { player: { displayName: "asc" } } }] });
  return prices.map((price) => {
    const previous = price.events[0] ? Number(price.events[0].previousPrice) : null;
    const current = Number(price.currentPrice); const change = previous === null ? 0 : current - previous;
    return { playerRegistrationId: price.playerRegistrationId, playerId: price.playerRegistration.playerId, displayName: price.playerRegistration.player.displayName,
      realTeamName: price.playerRegistration.teamRegistration.team.name, competitionSeasonId: price.competitionSeasonId, algorithmVersion: price.algorithmVersion,
      status: price.status, currentPrice: current, previousPrice: previous, changeCredits: change, changePercent: previous ? change / previous * 100 : null,
      trend: change > 0 ? "UP" : change < 0 ? "DOWN" : "FLAT", allTimeHigh: Number(price.allTimeHigh), allTimeLow: Number(price.allTimeLow),
      roundNumber: price.lastRoundNumber, updatedAt: price.updatedAt.toISOString() };
  });
}

function inputRevision(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
async function retrySerializable<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  try { return await operation(); } catch (error) {
    if (attempts > 1 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return retrySerializable(operation, attempts - 1);
    throw error;
  }
}
