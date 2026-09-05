import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "../../prisma/migrations/20260905000700_fantasy_scoring_engine/migration.sql"), "utf8");

describe("fantasy scoring PostgreSQL contract", () => {
  it("enforces idempotent inputs, immutable versions and one active ruleset", () => {
    expect(migration).toContain('UNIQUE ("player_game_stat_id", "rule_set_id", "source_stats_version")');
    expect(migration).toContain('WHERE "status" = \'ACTIVE\'');
    expect(migration).toContain("published fantasy rulesets are immutable");
    expect(migration).toContain('ON DELETE RESTRICT');
  });

  it("keeps activation history and validates non-calculable score states", () => {
    expect(migration).toContain('CREATE TABLE "fantasy_rule_set_activations"');
    expect(migration).toContain('"normalized_fantasy_points" IS NULL');
    expect(migration).toContain('source_hash_check');
  });
});
