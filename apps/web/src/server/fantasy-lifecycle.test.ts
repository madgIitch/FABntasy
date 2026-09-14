import { describe, expect, it } from "vitest";
import { eligibleRoundNumbers, provisionalRoundNumbers } from "./fantasy-lifecycle";

describe("fantasy lifecycle eligibility", () => {
  it("returns complete and partially synchronized rounds with final stats", () => {
    expect(eligibleRoundNumbers([
      { roundNumber: 2, status: "finished", hasStatistics: true, statsSyncStatus: "stats_final" },
      { roundNumber: 1, status: "finished", hasStatistics: true, statsSyncStatus: "stats_final" },
      { roundNumber: 1, status: "finished", hasStatistics: true, statsSyncStatus: "stats_final" },
      { roundNumber: 2, status: "finished", hasStatistics: true, statsSyncStatus: "pending" },
      { roundNumber: 3, status: "live", hasStatistics: true, statsSyncStatus: "stats_final" },
    ])).toEqual([1, 2]);
  });

  it("does not publish a round without a finished final boxscore", () => {
    expect(eligibleRoundNumbers([
      { roundNumber: 4, status: "finished", hasStatistics: true, statsSyncStatus: "pending" },
      { roundNumber: 4, status: "scheduled", hasStatistics: true, statsSyncStatus: "pending" },
      { roundNumber: 5, status: "live", hasStatistics: true, statsSyncStatus: "stats_final" },
      { roundNumber: 6, status: "finished", hasStatistics: false, statsSyncStatus: "stats_final" },
    ])).toEqual([]);
  });

  it("keeps the same round eligible when a pending game becomes final", () => {
    const finalGame = { roundNumber: 7, status: "finished", hasStatistics: true, statsSyncStatus: "stats_final" };
    const pendingGame = { roundNumber: 7, status: "finished", hasStatistics: true, statsSyncStatus: "pending" };

    expect(eligibleRoundNumbers([finalGame, pendingGame])).toEqual([7]);
    expect(eligibleRoundNumbers([finalGame, { ...pendingGame, statsSyncStatus: "stats_final" }])).toEqual([7]);
  });

  it("selects live rounds only after individual partial stats arrive", () => {
    expect(provisionalRoundNumbers([
      { roundNumber: 4, status: "live", hasStatistics: true, statsSyncStatus: "partial" },
      { roundNumber: 4, status: "scheduled", hasStatistics: true, statsSyncStatus: "pending" },
      { roundNumber: 5, status: "live", hasStatistics: true, statsSyncStatus: "pending" },
    ])).toEqual([4]);
  });
});
