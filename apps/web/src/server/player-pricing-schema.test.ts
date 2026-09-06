import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(resolve(root, "prisma/migrations/20260906000200_player_pricing/migration.sql"), "utf8");

describe("player pricing persistence contract", () => {
  it("keeps one global current price and additive revision events", () => {
    expect(schema).toContain("model PlayerPrice {");
    expect(schema).toContain("@@unique([playerRegistrationId, competitionSeasonId, algorithmVersion])");
    expect(schema).toContain("model PlayerPriceEvent {");
    expect(schema).toContain("@@unique([playerPriceId, roundNumber, algorithmVersion, inputRevision])");
  });

  it("protects non-negative prices and immutable references in SQL", () => {
    expect(migration).toContain("player_prices_non_negative");
    expect(migration).toContain("player_price_events_prices_non_negative");
    expect(migration).toContain("ON DELETE RESTRICT");
  });
});
