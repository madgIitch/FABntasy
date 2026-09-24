import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("active league selection contract", () => {
  it("validates an ACTIVE membership and falls back deterministically", () => {
    const service = readFileSync(new URL("./private-leagues.ts", import.meta.url), "utf8");
    expect(service).toContain('status: "ACTIVE", league: { status: "ACTIVE", legacyTeamId: null, competitionSeason: { fantasyEnabled: true } }');
    expect(service).toContain('orderBy: [{ joinedAt: "desc" }, { id: "asc" }]');
    expect(service).toContain("memberships.some((membership) => membership.leagueId === profile.activeLeagueId)");
    expect(service).toContain("activeLeagueId: leagueId");
  });

  it("uses an additive nullable preference in the schema and migration", () => {
    const schema = readFileSync(new URL("../../../../prisma/schema.prisma", import.meta.url), "utf8");
    const migration = readFileSync(new URL("../../../../prisma/migrations/20260917180000_active_league_selection/migration.sql", import.meta.url), "utf8");
    expect(schema).toContain("activeLeagueId          String?");
    expect(migration).toContain('ADD COLUMN "active_league_id" UUID');
    expect(migration).not.toMatch(/DROP|DELETE/i);
  });
});
