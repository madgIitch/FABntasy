import { describe, expect, it } from "vitest";
import { Decimal, NATIONAL_V1, PROVINCIAL_V1, SNAPSHOT_FIELDS, calculateFantasyScore, canonicalSnapshotJson, sourceStatsVersion, type CanonicalBoxscoreSnapshot, type NormalizationPopulation } from "../../../../packages/domain/fantasy-scoring";

const population: NormalizationPopulation = { count: 20, mean: "20", populationStandardDeviation: "10" };
function snapshot(values: Partial<CanonicalBoxscoreSnapshot["stats"]> = {}): CanonicalBoxscoreSnapshot {
  return { schemaVersion: "player-game-stat.v1", playerGameStatId: "stat-1", playerId: "player-1", gameId: "game-1", competitionId: "competition-1", competitionSeasonId: "season-1", roundNumber: 1,
    stats: Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, "0"])) as unknown as CanonicalBoxscoreSnapshot["stats"], ...{},
    ...(values ? { stats: { ...(Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, "0"])) as unknown as CanonicalBoxscoreSnapshot["stats"]), ...values } } : {}),
  };
}

describe("fantasy scoring v1 golden cases", () => {
  it("calculates the official provincial example exactly and deterministically", () => {
    const input = snapshot({ minutesPlayed: "30", points: "20", threePointersMade: "2", freeThrowsMade: "4", foulsCommitted: "3" });
    const first = calculateFantasyScore(input, PROVINCIAL_V1, population);
    expect(first.rawScore).toBe("20.5"); expect(first.normalizedFantasyPoints).toBe("20.5");
    expect(JSON.stringify(first)).toBe(JSON.stringify(calculateFantasyScore(input, PROVINCIAL_V1, population)));
    expect(sourceStatsVersion(input)).toMatch(/^[0-9a-f]{64}$/);
    expect(canonicalSnapshotJson(input)).toContain('"minutesPlayed":"30"');
  });

  it("calculates the official national example", () => {
    const result = calculateFantasyScore(snapshot({ minutesPlayed: "31", points: "20", rebounds: "8", assists: "5", steals: "2", blocks: "1", turnovers: "3", twoPointersMade: "5", twoPointersAttempted: "10", threePointersMade: "2", threePointersAttempted: "5", freeThrowsMade: "4", freeThrowsAttempted: "6", foulsCommitted: "3" }), NATIONAL_V1, { count: 20, mean: "25", populationStandardDeviation: "10" });
    expect(result.rawScore).toBe("35.1"); expect(result.normalizedFantasyPoints).toBe("30.1");
  });

  it("preserves required nulls, while unused nulls do not become zero", () => {
    const missing = calculateFantasyScore(snapshot({ minutesPlayed: "12", points: null }), PROVINCIAL_V1, population);
    expect(missing).toMatchObject({ status: "NOT_CALCULABLE", errorCode: "MISSING_REQUIRED_STAT", rawScore: null, normalizedFantasyPoints: null });
    expect(missing.breakdown.rawTerms[0].originalValue).toBeNull();
    expect(calculateFantasyScore(snapshot({ minutesPlayed: "12", rebounds: null }), PROVINCIAL_V1, population).status).toBe("CALCULATED");
  });

  it("handles DNP, insufficient samples, zero deviation and negative raw", () => {
    expect(calculateFantasyScore(snapshot(), PROVINCIAL_V1, population)).toMatchObject({ status: "DNP", normalizedFantasyPoints: "0.0" });
    const played = snapshot({ minutesPlayed: "1", points: "0" });
    expect(calculateFantasyScore(played, PROVINCIAL_V1, { count: 19, mean: "0", populationStandardDeviation: "1" }).errorCode).toBe("INSUFFICIENT_NORMALIZATION_SAMPLE");
    expect(calculateFantasyScore(played, PROVINCIAL_V1, { count: 20, mean: "0", populationStandardDeviation: "0" }).errorCode).toBe("ZERO_NORMALIZATION_DEVIATION");
    expect(calculateFantasyScore(snapshot({ minutesPlayed: "10", foulsCommitted: "10" }), PROVINCIAL_V1, population).rawScore).toBe("-5.0");
  });

  it("clamps extremes, has no v1 bonuses and uses half-up boundaries", () => {
    expect(calculateFantasyScore(snapshot({ minutesPlayed: "1", points: "1000" }), PROVINCIAL_V1, population).normalizedFantasyPoints).toBe("50.0");
    expect(calculateFantasyScore(snapshot({ minutesPlayed: "1", foulsCommitted: "1000" }), PROVINCIAL_V1, population).normalizedFantasyPoints).toBe("0.0");
    expect(PROVINCIAL_V1.bonuses).toEqual([]);
    expect(Decimal.from("20.04").round(1).toString(1)).toBe("20.0"); expect(Decimal.from("20.05").round(1).toString(1)).toBe("20.1");
  });
});
