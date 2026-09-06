import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";

describe("market persistence",()=>{
  const schema=readFileSync("../../prisma/schema.prisma","utf8");
  const migration=readFileSync("../../prisma/migrations/20260906000400_market_transactions/migration.sql","utf8");
  it("enforces exclusive ownership inside a league",()=>expect(schema).toContain("@@unique([leagueId, playerRegistrationId])"));
  it("creates the immutable economic records",()=>{expect(migration).toContain('CREATE TABLE "market_transactions"');expect(migration).toContain('CREATE TABLE "fantasy_budget_ledger"');expect(migration).toContain('CREATE TABLE "market_protections"');});
});
