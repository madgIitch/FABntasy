import { describe, expect, it } from "vitest";
import { eligibleRoundNumbers } from "./fantasy-lifecycle";

describe("fantasy lifecycle eligibility", () => {
  it("only returns rounds whose complete game cohort is final", () => {
    expect(eligibleRoundNumbers([
      { roundNumber: 2, status: "finished", hasStatistics: true, statsSyncStatus: "stats_final" },
      { roundNumber: 1, status: "finished", hasStatistics: true, statsSyncStatus: "stats_final" },
      { roundNumber: 1, status: "finished", hasStatistics: true, statsSyncStatus: "stats_final" },
      { roundNumber: 2, status: "finished", hasStatistics: true, statsSyncStatus: "pending" },
      { roundNumber: 3, status: "live", hasStatistics: true, statsSyncStatus: "stats_final" },
    ])).toEqual([1]);
  });
});
