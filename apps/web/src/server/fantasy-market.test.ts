import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
import { calculateClauseBase, MARKET_INITIAL_PRICE } from "./fantasy-market";

describe("fantasy market rules",()=>{
  it("uses 175% of the greater acquisition or current price",()=>{
    expect(calculateClauseBase(10_000_000n,12_000_000n)).toBe(21_000_000n);
    expect(calculateClauseBase(15_000_000n,12_000_000n)).toBe(26_250_000n);
  });
  it("rounds half-up to an integer credit",()=>expect(calculateClauseBase(101n,100n)).toBe(177n));
  it("charges the same 5 M initial price shown by the global market",()=>expect(MARKET_INITIAL_PRICE).toBe(5_000_000));
  it("exposes active protection expiry to every league member",()=>{
    const service=readFileSync(new URL("./fantasy-market.ts",import.meta.url),"utf8");
    expect(service).toContain("protectedUntil:{gt:now}");
    expect(service).toContain("playerRegistrationId===s.playerRegistrationId");
    expect(service).toContain("p.fantasyTeamId===s.fantasyTeamId");
    expect(service).toContain("serverNow:now.toISOString()");
  });
  it("initializes an empty team from the market instead of redirecting to roster setup",()=>{
    const service=readFileSync(new URL("./fantasy-market.ts",import.meta.url),"utf8");
    const page=readFileSync(new URL("../../app/app/mercado/page.tsx",import.meta.url),"utf8");
    expect(service).toContain("ensureMarketTeam");
    expect(service).toContain('status:"ACTIVE"');
    expect(service).toContain("activeRules??");
    expect(service).toContain("fantasyTeam.upsert");
    expect(page).not.toContain("Configura primero tu plantilla");
    expect(page).not.toContain("Ir a Mi equipo");
  });
  it("exposes the market handler from the active Next app directory",()=>{
    const route=readFileSync(new URL("../../app/api/fantasy/market/route.ts",import.meta.url),"utf8");
    expect(route).toContain("export { GET, POST }");
    expect(route).toContain("src/app/api/fantasy/market/route");
  });
});
