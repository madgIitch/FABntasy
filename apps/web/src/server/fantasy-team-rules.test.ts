import { describe, expect, it } from "vitest";
import { COLD_START_RULES, FantasyTeamRuleError, isCutoffClosed, validateLineup, validateRoster } from "../../../../packages/domain/fantasy-team";

const players = (prices = Array(7).fill(3_000_000)) => prices.map((priceCredits, index) => ({
  playerRegistrationId: `registration-${index}`, realTeamId: `team-${Math.floor(index / 2)}`, priceCredits,
}));

describe("fantasy roster rules", () => {
  it("accepts the exact budget and rejects one credit over it", () => {
    expect(COLD_START_RULES.version).toBe("2");
    expect(COLD_START_RULES.budgetCredits).toBe(60_000_000);
    const exactPrices = [8_571_432, ...Array(6).fill(8_571_428)];
    expect(validateRoster(players(exactPrices), COLD_START_RULES)).toEqual({ used: 60_000_000, remaining: 0 });
    expect(() => validateRoster(players([exactPrices[0] + 1, ...exactPrices.slice(1)]), COLD_START_RULES)).toThrowError(expect.objectContaining({ code: "BUDGET_EXCEEDED" }));
  });

  it("rejects duplicate registrations, roster sizes and the real-team limit", () => {
    const duplicate = players(); duplicate[6] = { ...duplicate[6], playerRegistrationId: duplicate[0].playerRegistrationId };
    expect(() => validateRoster(duplicate, COLD_START_RULES)).toThrowError(expect.objectContaining({ code: "PLAYER_DUPLICATE" }));
    expect(() => validateRoster(players().slice(0, 6), COLD_START_RULES)).toThrowError(expect.objectContaining({ code: "ROSTER_INVALID" }));
    const teamLimit = players().map((player, index) => ({ ...player, realTeamId: index < 3 ? "same-team" : player.realTeamId }));
    expect(() => validateRoster(teamLimit, COLD_START_RULES)).toThrowError(expect.objectContaining({ code: "TEAM_LIMIT_EXCEEDED" }));
  });

  it("supports every declared positional cap without assigning positions in v1", () => {
    expect(COLD_START_RULES.positionLimits).toEqual({});
    const positional = { ...COLD_START_RULES, positionLimits: { guard: 1 } };
    const candidates = players().map((player, index) => ({ ...player, position: index < 2 ? "guard" : "forward" }));
    expect(() => validateRoster(candidates, positional)).toThrowError(expect.objectContaining({ code: "ROSTER_INVALID" }));
  });

  it("requires five unique starters and two unique substitutes from the roster", () => {
    const roster = players().map((x) => x.playerRegistrationId);
    expect(() => validateLineup(roster.slice(0, 5), roster.slice(5), roster, COLD_START_RULES)).not.toThrow();
    expect(() => validateLineup(roster.slice(0, 5), [roster[4], roster[6]], roster, COLD_START_RULES)).toThrowError(FantasyTeamRuleError);
  });

  it("uses an inclusive cutoff with a controllable clock", () => {
    const cutoff = new Date("2026-09-06T10:00:00.000Z");
    expect(isCutoffClosed(new Date("2026-09-06T09:59:59.999Z"), cutoff)).toBe(false);
    expect(isCutoffClosed(new Date("2026-09-06T10:00:00.000Z"), cutoff)).toBe(true);
  });
});
