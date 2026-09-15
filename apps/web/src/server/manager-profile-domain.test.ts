import { describe, expect, it } from "vitest";
import { TROPHY_ICONS, calculateStreak, publicInitials } from "../../../../packages/domain/manager-profile";

describe("manager profile domain", () => {
  it("maps the exact seven semantic trophy assets", () => {
    expect(Object.keys(TROPHY_ICONS)).toHaveLength(7);
    expect(TROPHY_ICONS.LEAGUE_LAST_PLACE.src).toContain("trophy-league-last-place.png");
    expect(TROPHY_ICONS.ROUND_LAST_PLACE.src).toContain("achievement-round-last-place.png");
    expect(TROPHY_ICONS.CURRENT_LEAGUE_LEADER.src).toContain("badge-current-league-leader.png");
    expect(TROPHY_ICONS.ROUND_MVP.src).toContain("achievement-round-mvp.png");
  });

  it("counts consecutive MVP rounds including ties", () => {
    expect(calculateStreak([
      { seasonId: "s1", roundNumber: 1, revision: 1, points: 10, maxPoints: 10 },
      { seasonId: "s1", roundNumber: 2, revision: 1, points: 12, maxPoints: 12 },
    ]).length).toBe(2);
  });

  it("stops on a gap and uses the latest correction", () => {
    expect(calculateStreak([
      { seasonId: "s1", roundNumber: 2, revision: 1, points: 8, maxPoints: 9 },
      { seasonId: "s1", roundNumber: 2, revision: 2, points: 9, maxPoints: 9 },
      { seasonId: "s1", roundNumber: 4, revision: 1, points: 9, maxPoints: 9 },
    ]).length).toBe(1);
    expect(calculateStreak([{ seasonId: "s2", roundNumber: 1, revision: 1, points: null, maxPoints: 3 }]).length).toBe(0);
  });

  it("creates useful public initials", () => {
    expect(publicInitials("Pepe García")).toBe("PG");
    expect(publicInitials("@marcos")).toBe("MA");
  });
});
