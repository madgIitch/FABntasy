import { describe, expect, it } from "vitest";
import { currentMarketMidnight, nextMarketMidnight, projectMarketResult, rankMarketBids, rotatingCandidates } from "./market-v2";

describe("Market V2 cycle and allocation rules", () => {
  it("closes at Madrid midnight across summer and winter clock changes", () => {
    expect(nextMarketMidnight(new Date("2026-03-28T16:00:00Z")).toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(nextMarketMidnight(new Date("2026-03-29T16:00:00Z")).toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(nextMarketMidnight(new Date("2026-10-24T16:00:00Z")).toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(nextMarketMidnight(new Date("2026-10-25T16:00:00Z")).toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(currentMarketMidnight(new Date("2026-09-24T14:00:00Z")).toISOString()).toBe("2026-09-23T22:00:00.000Z");
  });

  it("rotates never listed and least recently listed free players first", () => {
    const candidates = [{ id: "d" }, { id: "c" }, { id: "b" }, { id: "a" }];
    expect(rotatingCandidates(candidates, new Set(["d"]), new Map([["a", 200], ["b", 100]]), 3).map(x => x.id)).toEqual(["c", "b", "a"]);
  });

  it("awards equal amounts to the earliest active bid, then stable id", () => {
    const earlier = new Date("2026-09-24T10:00:00Z"), later = new Date("2026-09-24T10:01:00Z");
    const bids = [{ id: "b", amountCredits: 6n, bidAt: earlier }, { id: "a", amountCredits: 6n, bidAt: earlier }, { id: "high", amountCredits: 7n, bidAt: later }, { id: "late", amountCredits: 6n, bidAt: later }];
    expect(rankMarketBids(bids).map(b => b.id)).toEqual(["high", "a", "b", "late"]);
  });

  it("shows the winning price publicly while revealing rival bids only to participants", () => {
    const bids = [
      { fantasyTeamId: "a", status: "WON", amountCredits: 6n, fantasyTeam: { userProfile: { username: "ana", displayName: null } } },
      { fantasyTeamId: "b", status: "LOST", amountCredits: 5n, fantasyTeam: { userProfile: { username: "bea", displayName: null } } },
      { fantasyTeamId: "c", status: "CANCELLED", amountCredits: 9n, fantasyTeam: { userProfile: { username: "car", displayName: null } } },
    ];
    expect(projectMarketResult("player", bids, "spectator")).toMatchObject({ winner: "ana", winningPrice: 6, bids: [] });
    expect(projectMarketResult("player", bids, "b").bids.map(b => b.manager)).toEqual(["ana", "bea"]);
    expect(projectMarketResult("player", bids, "c").bids).toEqual([]);
  });
});
