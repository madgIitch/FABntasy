import { describe, expect, it, vi } from "vitest";

const requireFantasyCompetition = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("./fantasy-availability", () => ({
  FantasyCompetitionDisabledError: class extends Error { code = "COMPETITION_DISABLED"; },
  requireFantasyCompetition,
}));

import { requireSelectedSeason, selectedSeasonIds } from "./league-competition-seasons";

describe("league edition eligibility", () => {
  it("uses the immutable selection and rejects players from another edition", async () => {
    const client = { fantasyLeague: { findUnique: vi.fn().mockResolvedValue({ competitionSeasonId: "primary", selectedSeasons: [{ competitionSeasonId: "primary" }, { competitionSeasonId: "secondary" }] }) } };
    expect(await selectedSeasonIds(client as never, "league")).toEqual(["primary", "secondary"]);
    expect(await requireSelectedSeason(client as never, "league", "foreign")).toBe(false);
    expect(requireFantasyCompetition).not.toHaveBeenCalled();
    expect(await requireSelectedSeason(client as never, "league", "secondary")).toBe(true);
    expect(requireFantasyCompetition).toHaveBeenCalledWith(client, "secondary");
  });

  it("keeps the legacy edition during an additive migration", async () => {
    const client = { fantasyLeague: { findUnique: vi.fn().mockResolvedValue({ competitionSeasonId: "primary", selectedSeasons: [] }) } };
    expect(await selectedSeasonIds(client as never, "league")).toEqual(["primary"]);
  });
});
