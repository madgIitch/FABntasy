import { describe, expect, it } from "vitest";
import { PLAYER_PRICING_V1, calculatePriceCohort, capitalGainCredits, releaseClauseCredits, type PricingPlayerInput } from "../../../../packages/domain/player-pricing";

const cohort = (count = 20, overrides: Partial<PricingPlayerInput> = {}): PricingPlayerInput[] => Array.from({ length: count }, (_, index) => ({
  playerRegistrationId: `player-${index}`, currentPrice: 5_000_000, performances: [String(index + 1)], outcome: "PLAYED", consecutiveDnp: 0, ...overrides,
}));

describe("Canastio player pricing v1", () => {
  it("keeps the global cold-start price while the market sample is insufficient", () => {
    const result = calculatePriceCohort(cohort(19), 1);
    expect(result.every((item) => item.newPrice === 5_000_000 && item.status === "INSUFFICIENT_MARKET_SAMPLE")).toBe(true);
  });

  it("uses 50/30/20 recent form and a 70/30 market rating", () => {
    const players = cohort(); players[19] = { ...players[19], performances: ["10", "20", "40"] };
    const result = calculatePriceCohort(players, 4).find((item) => item.playerRegistrationId === "player-19")!;
    expect(result.recentForm).toBe("28.000000");
    expect(result.seasonAverage).toBe("23.333333");
    expect(result.marketRating).toBe("26.600000");
  });

  it("assigns equal midrank percentiles to ties", () => {
    const players = cohort(); players[18] = { ...players[18], performances: ["20"] }; players[19] = { ...players[19], performances: ["20"] };
    const result = calculatePriceCohort(players, 1);
    expect(result[18].percentile).toBe(result[19].percentile);
  });

  it("prices a production-sized cohort deterministically", () => {
    const players = cohort(500);
    const first = calculatePriceCohort(players, 4);
    const second = calculatePriceCohort(players, 4);
    expect(first).toEqual(second);
    expect(first).toHaveLength(500);
    expect(first.every((item) => Number.isSafeInteger(item.newPrice)
      && item.newPrice >= PLAYER_PRICING_V1.minimumPrice
      && item.newPrice <= PLAYER_PRICING_V1.maximumPrice)).toBe(true);
  });

  it("caps early rises at 12 percent and mature falls at 10 percent", () => {
    expect(calculatePriceCohort(cohort(), 1).at(-1)!.newPrice).toBe(5_600_000);
    expect(calculatePriceCohort(cohort(20, { currentPrice: 20_000_000 }), 4)[0].newPrice).toBe(18_000_000);
  });

  it("does not move postponed players and applies progressive DNP pressure", () => {
    const players = cohort(22); players[0] = { ...players[0], outcome: "NO_SCHEDULED_GAME", performances: [] };
    players[1] = { ...players[1], outcome: "DNP", performances: [], consecutiveDnp: 2 };
    const result = calculatePriceCohort(players, 4);
    expect(result[0]).toMatchObject({ status: "NO_SCHEDULED_GAME", newPrice: 5_000_000 });
    expect(result[1]).toMatchObject({ status: "DNP_ADJUSTMENT", newPrice: 4_850_000 });
  });

  it("calculates clause and capital gain independently from market price", () => {
    expect(releaseClauseCredits(10_800_000, 12_400_000)).toBe(21_700_000);
    expect(capitalGainCredits(5_200_000, 11_800_000)).toBe(6_600_000);
    expect(PLAYER_PRICING_V1.initialPrice).toBe(5_000_000);
  });
});
