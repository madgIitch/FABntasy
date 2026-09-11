import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(resolve(root, "prisma/migrations/20260911000400_live_game_score_ingestion/migration.sql"), "utf8");
const boxscore = readFileSync(resolve(root, "services/fab_ingestor/fab_ingestor/boxscore.py"), "utf8");
const repository = readFileSync(resolve(root, "services/fab_ingestor/fab_ingestor/repository.py"), "utf8");

describe("live game ingestion contract", () => {
  it("persists score provenance and freshness additively", () => {
    expect(schema).toContain('scoreSource         String?                  @map("score_source")');
    expect(schema).toContain('liveScoreUpdatedAt  DateTime?                @map("live_score_updated_at")');
    expect(migration).toContain('ADD COLUMN "score_source" TEXT');
    expect(migration).toContain('ADD COLUMN "live_score_updated_at" TIMESTAMPTZ(3)');
  });

  it("keeps partial players while reserving strict validation for final data", () => {
    expect(boxscore).toContain("if is_final:");
    expect(boxscore).toContain("repository.mark_game_stats_partial");
    expect(boxscore).toContain("_map_stats(row, partial=not is_final)");
    expect(repository).toContain("def advisory_game_lock");
    expect(repository).toContain("updated_at < current[1]");
  });
});
