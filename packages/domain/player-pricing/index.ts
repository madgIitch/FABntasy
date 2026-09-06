import { Decimal } from "../fantasy-scoring/decimal";

export const PLAYER_PRICING_V1 = Object.freeze({
  version: "canastio-market-v1",
  initialPrice: 5_000_000,
  minimumPrice: 2_000_000,
  maximumPrice: 22_000_000,
  minimumSample: 20,
  earlyRoundCount: 3,
  earlyAlpha: "0.50",
  matureAlpha: "0.25",
  maximumRise: "0.12",
  maximumFall: "0.10",
  curve: Object.freeze([
    { percentile: "0", price: 2_000_000 }, { percentile: "20", price: 3_000_000 },
    { percentile: "40", price: 6_000_000 }, { percentile: "60", price: 9_000_000 },
    { percentile: "80", price: 14_000_000 }, { percentile: "95", price: 18_000_000 },
    { percentile: "100", price: 22_000_000 },
  ]),
});

export type RoundOutcome = "PLAYED" | "DNP" | "NO_SCHEDULED_GAME";
export type PriceStatus = "CONFIRMED" | "INSUFFICIENT_MARKET_SAMPLE" | "NO_SCHEDULED_GAME" | "DNP_ADJUSTMENT";

export type PricingPlayerInput = Readonly<{
  playerRegistrationId: string;
  currentPrice: number;
  performances: readonly string[];
  outcome: RoundOutcome;
  consecutiveDnp: number;
}>;

export type PricingResult = Readonly<{
  playerRegistrationId: string;
  status: PriceStatus;
  previousPrice: number;
  targetPrice: number | null;
  newPrice: number;
  recentForm: string | null;
  seasonAverage: string | null;
  marketRating: string | null;
  percentile: string | null;
  dnpStreak: number;
}>;

type Rated = PricingPlayerInput & { recent: Decimal; average: Decimal; rating: Decimal };

export function calculatePriceCohort(players: readonly PricingPlayerInput[], confirmedRoundCount: number): PricingResult[] {
  if (!Number.isSafeInteger(confirmedRoundCount) || confirmedRoundCount < 1) throw new Error("INVALID_ROUND_COUNT");
  players.forEach(validatePlayer);
  const rated: Rated[] = players.filter((p) => p.outcome === "PLAYED" && p.performances.length > 0).map((player) => {
    const values = player.performances.map(Decimal.from);
    const recentValues = values.slice(-3).reverse();
    const recentWeights = [Decimal.from("0.50"), Decimal.from("0.30"), Decimal.from("0.20")].slice(0, recentValues.length);
    const weightTotal = sum(recentWeights);
    const recent = sum(recentValues.map((value, index) => value.mul(recentWeights[index]))).div(weightTotal);
    const average = sum(values).div(Decimal.from(values.length));
    return { ...player, recent, average, rating: recent.mul(Decimal.from("0.70")).add(average.mul(Decimal.from("0.30"))) };
  });
  if (rated.length < PLAYER_PRICING_V1.minimumSample) return players.map((player) => unchanged(player, "INSUFFICIENT_MARKET_SAMPLE"));

  const sorted = [...rated].sort((a, b) => a.rating.compare(b.rating));
  const percentiles = new Map<string, Decimal>();
  for (let start = 0; start < sorted.length;) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1].rating.compare(sorted[start].rating) === 0) end += 1;
    const midpoint = Decimal.from(start + end).div(Decimal.from(2));
    const percentile = midpoint.div(Decimal.from(sorted.length - 1)).mul(Decimal.from(100));
    for (let index = start; index <= end; index += 1) percentiles.set(sorted[index].playerRegistrationId, percentile);
    start = end + 1;
  }
  const ratedById = new Map(rated.map((entry) => [entry.playerRegistrationId, entry]));
  return players.map((player) => {
    const entry = ratedById.get(player.playerRegistrationId);
    if (entry) {
      const percentile = percentiles.get(player.playerRegistrationId)!;
      const target = targetForPercentile(percentile);
      const alpha = Decimal.from(confirmedRoundCount <= PLAYER_PRICING_V1.earlyRoundCount ? PLAYER_PRICING_V1.earlyAlpha : PLAYER_PRICING_V1.matureAlpha);
      const desired = Decimal.from(player.currentPrice).add(Decimal.from(target).sub(Decimal.from(player.currentPrice)).mul(alpha));
      const lower = Decimal.from(player.currentPrice).mul(Decimal.from("0.90"));
      const upper = Decimal.from(player.currentPrice).mul(Decimal.from("1.12"));
      const newPrice = credits(desired.clamp(lower, upper).clamp(Decimal.from(PLAYER_PRICING_V1.minimumPrice), Decimal.from(PLAYER_PRICING_V1.maximumPrice)));
      return metrics(player, "CONFIRMED", target, newPrice, entry, percentile);
    }
    if (player.outcome === "DNP") {
      const rate = player.consecutiveDnp <= 1 ? "0.98" : player.consecutiveDnp === 2 ? "0.97" : "0.96";
      const newPrice = credits(Decimal.from(player.currentPrice).mul(Decimal.from(rate)).clamp(Decimal.from(PLAYER_PRICING_V1.minimumPrice), Decimal.from(PLAYER_PRICING_V1.maximumPrice)));
      return { ...unchanged(player, "DNP_ADJUSTMENT"), newPrice, dnpStreak: player.consecutiveDnp };
    }
    return unchanged(player, "NO_SCHEDULED_GAME");
  });
}

export function releaseClauseCredits(acquisitionPrice: number, marketPrice: number): number {
  assertCredits(acquisitionPrice); assertCredits(marketPrice);
  return credits(Decimal.from(Math.max(acquisitionPrice, marketPrice)).mul(Decimal.from("1.75")));
}

export function capitalGainCredits(acquisitionPrice: number, marketPrice: number): number {
  assertCredits(acquisitionPrice); assertCredits(marketPrice);
  return marketPrice - acquisitionPrice;
}

function targetForPercentile(percentile: Decimal): number {
  const curve = PLAYER_PRICING_V1.curve;
  for (let index = 1; index < curve.length; index += 1) {
    const right = curve[index]; const left = curve[index - 1];
    if (percentile.compare(Decimal.from(right.percentile)) <= 0) {
      const position = percentile.sub(Decimal.from(left.percentile)).div(Decimal.from(right.percentile).sub(Decimal.from(left.percentile)));
      return credits(Decimal.from(left.price).add(Decimal.from(right.price - left.price).mul(position)));
    }
  }
  return PLAYER_PRICING_V1.maximumPrice;
}

function metrics(player: PricingPlayerInput, status: PriceStatus, targetPrice: number, newPrice: number, rated: Rated, percentile: Decimal): PricingResult {
  return { playerRegistrationId: player.playerRegistrationId, status, previousPrice: player.currentPrice, targetPrice, newPrice,
    recentForm: rated.recent.toString(6), seasonAverage: rated.average.toString(6), marketRating: rated.rating.toString(6), percentile: percentile.toString(6), dnpStreak: 0 };
}

function unchanged(player: PricingPlayerInput, status: PriceStatus): PricingResult {
  return { playerRegistrationId: player.playerRegistrationId, status, previousPrice: player.currentPrice, targetPrice: null, newPrice: player.currentPrice,
    recentForm: null, seasonAverage: null, marketRating: null, percentile: null, dnpStreak: player.outcome === "DNP" ? player.consecutiveDnp : 0 };
}

function validatePlayer(player: PricingPlayerInput) {
  if (!player.playerRegistrationId || player.performances.some((value) => !/^-?\d+(\.\d+)?$/.test(value))) throw new Error("INVALID_INPUT");
  assertCredits(player.currentPrice);
  if (!Number.isSafeInteger(player.consecutiveDnp) || player.consecutiveDnp < 0) throw new Error("INVALID_INPUT");
  if (player.outcome === "PLAYED" && player.performances.length === 0) throw new Error("INVALID_INPUT");
}

function assertCredits(value: number) { if (!Number.isSafeInteger(value) || value < 0) throw new Error("INVALID_CREDITS"); }
function credits(value: Decimal) { return Number(value.round(0).toString(0)); }
function sum(values: readonly Decimal[]) { return values.reduce((total, value) => total.add(value), Decimal.zero); }
