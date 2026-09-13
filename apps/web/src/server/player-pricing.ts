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

export function isAggregatePlayerName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("es") === "totales";
}

export async function recomputePlayerPrices(competitionSeasonId: string, roundNumber: number, algorithmVersion = PLAYER_PRICING_V1.version) {
  if (algorithmVersion !== PLAYER_PRICING_V1.version) throw new Error("UNSUPPORTED_ALGORITHM_VERSION");
  if (!Number.isSafeInteger(roundNumber) || roundNumber < 1) throw new Error("INVALID_ROUND_NUMBER");
  return retrySerializable(() => db.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`player-pricing:${competitionSeasonId}:${algorithmVersion}`}))`);
    const registrations = (await tx.playerRegistration.findMany({
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
    })).filter((registration) => !isAggregatePlayerName(registration.player.displayName));
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
    const existingIds = new Set(registrations.flatMap((registration) => registration.prices.map((price) => price.playerRegistrationId)));
    await tx.playerPrice.createMany({
      data: results.filter((result) => !existingIds.has(result.playerRegistrationId)).map((result) => ({
        playerRegistrationId: result.playerRegistrationId, competitionSeasonId, algorithmVersion,
        currentPrice: result.newPrice, status: result.status, lastRoundNumber: roundNumber,
        allTimeHigh: result.newPrice, allTimeLow: result.newPrice,
      })),
      skipDuplicates: true,
    });
    if (results.length) {
      const rows = results.map((result) => Prisma.sql`(
        ${result.playerRegistrationId}::uuid,
        ${BigInt(result.newPrice)}::bigint,
        ${result.status}::text,
        ${roundNumber}::integer
      )`);
      await tx.$executeRaw(Prisma.sql`
        UPDATE player_prices AS price
        SET current_price = change.new_price,
            status = change.status,
            last_round_number = change.round_number,
            all_time_high = GREATEST(price.all_time_high, change.new_price),
            all_time_low = LEAST(price.all_time_low, change.new_price),
            updated_at = NOW()
        FROM (VALUES ${Prisma.join(rows)}) AS change(player_registration_id, new_price, status, round_number)
        WHERE price.player_registration_id = change.player_registration_id
          AND price.competition_season_id = ${competitionSeasonId}::uuid
          AND price.algorithm_version = ${algorithmVersion}
      `);
    }
    const persistedPrices = await tx.playerPrice.findMany({
      where: { competitionSeasonId, algorithmVersion, playerRegistrationId: { in: results.map((result) => result.playerRegistrationId) } },
      select: { id: true, playerRegistrationId: true },
    });
    const priceIdByRegistration = new Map(persistedPrices.map((price) => [price.playerRegistrationId, price.id]));
    const inputByRegistration = new Map(input.map((item) => [item.playerRegistrationId, item]));
    await tx.playerPriceEvent.createMany({ data: results.map((result) => ({
      playerPriceId: priceIdByRegistration.get(result.playerRegistrationId)!, playerRegistrationId: result.playerRegistrationId, competitionSeasonId,
      roundNumber, algorithmVersion, inputRevision: revision, status: result.status, previousPrice: result.previousPrice, targetPrice: result.targetPrice,
      newPrice: result.newPrice, recentForm: result.recentForm, seasonAverage: result.seasonAverage, marketRating: result.marketRating,
      percentile: result.percentile, dnpStreak: result.dnpStreak,
      inputSnapshot: inputByRegistration.get(result.playerRegistrationId)! as unknown as Prisma.InputJsonValue,
    })), skipDuplicates: true });
    return { competitionSeasonId, roundNumber, algorithmVersion, inputRevision: revision, updated: results.length };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 10_000,
    timeout: 30_000,
  }));
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
  return prices.filter((price) => !isAggregatePlayerName(price.playerRegistration.player.displayName)).map((price) => {
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
