import { describe, expect, it } from "vitest";
import { calculateRoundScore, rankTeams } from "../../../../packages/domain/round-scoring";

const starter = (id: string, status: "CALCULATED" | "DNP" = "CALCULATED", points = "10") => ({ playerRegistrationId: id, displayName: id,
  scores: [{ id: `score-${id}`, status, points: status === "DNP" ? "0" : points, sourceStatsVersion: "v1" }] });

describe("round scoring", () => {
  it("adds five starters and treats DNP as zero", () => {
    const result = calculateRoundScore({ fantasyTeamId: "t", leagueId: "l", createdAt: new Date(0), lineupId: "x", lineupRevision: 1,
      starters: [starter("1"), starter("2"), starter("3", "DNP"), starter("4"), starter("5")] });
    expect(result.status).toBe("PUBLISHED"); expect(result.points).toBe("40.000000");
    expect(result.contributions[2]).toMatchObject({ status: "DNP", points: "0.000000" });
  });
  it("keeps non-terminal scores provisional", () => {
    const pending = { ...starter("1"), scores: [{ id: "p", status: "PENDING" as const, points: null, sourceStatsVersion: "v1" }] };
    expect(calculateRoundScore({ fantasyTeamId: "t", leagueId: "l", createdAt: new Date(0), lineupId: "x", lineupRevision: 1,
      starters: [pending, starter("2"), starter("3"), starter("4"), starter("5")] })).toMatchObject({ status: "PROVISIONAL", points: null });
  });
  it("uses every deterministic tie breaker", () => {
    const createdAt = new Date("2026-01-01");
    const ranked = rankTeams([{ fantasyTeamId: "b", totalPoints: 50, lastRoundPoints: 10, bestRoundPoints: 20, createdAt },
      { fantasyTeamId: "a", totalPoints: 50, lastRoundPoints: 10, bestRoundPoints: 20, createdAt },
      { fantasyTeamId: "c", totalPoints: 50, lastRoundPoints: 11, bestRoundPoints: 15, createdAt }]);
    expect(ranked.map((x) => x.fantasyTeamId)).toEqual(["c", "a", "b"]);
  });
});
