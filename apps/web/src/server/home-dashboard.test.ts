import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMarketMovers } from "./home-dashboard";

const event=(id:string,name:string,previous:number,next:number,roundNumber=4,createdAt="2026-09-10T10:00:00Z")=>({
  playerRegistrationId:id,roundNumber,previousPrice:BigInt(previous),newPrice:BigInt(next),createdAt:new Date(createdAt),
  playerPrice:{currentPrice:BigInt(next)},playerRegistration:{player:{displayName:name}},
});

describe("home dashboard contract",()=>{
  it("deduplicates players, rejects non-comparable prices and returns five deterministic movers",()=>{
    const result=buildMarketMovers([
      event("a","Álex",100,140,5),event("a","Álex",100,110,4,"2026-09-09T10:00:00Z"),event("b","Berta",100,60),
      event("c","Carla",100,130),event("d","Dani",100,125),event("e","Eva",100,120),event("f","Fran",100,115),event("zero","Sin base",0,100),
    ]);
    expect(result).toHaveLength(5);
    expect(result.map((item)=>item.id)).toEqual(["a","b","c","d","e"]);
    expect(result[0]).toMatchObject({price:140,change:40,percentage:40,period:"Jornada 5"});
  });

  it("keeps identity server-side and isolates optional section failures",()=>{
    const page=readFileSync(new URL("../../app/app/page.tsx",import.meta.url),"utf8");
    const service=readFileSync(new URL("./home-dashboard.ts",import.meta.url),"utf8");
    expect(page).toContain("auth.getUser()");
    expect(page).toContain("getHomeDashboard(user.id, league)");
    expect(service).toContain("LEAGUE_NOT_AVAILABLE");
    expect(service).toContain("[home-dashboard] section_failed");
    expect(service).toContain("schemaVersion:\"canastio.home.v1\"");
  });

  it("ships explicit onboarding, pending, direct navigation and bounded live refresh states",()=>{
    const component=readFileSync(new URL("../components/home-dashboard.tsx",import.meta.url),"utf8");
    const refresh=readFileSync(new URL("../components/home-dashboard-refresh.tsx",import.meta.url),"utf8");
    expect(component).toContain("Completa tu perfil");
    expect(component).toContain("Entra en una liga");
    expect(component).toContain("Puntuación y clasificación pendientes");
    expect(component).toContain("/app/mi-equipo");
    expect(component).toContain("/app/partidos/");
    expect(refresh).toContain("document.visibilityState");
    expect(refresh).toContain("45000");
    expect(refresh).toContain("refreshing.current");
  });
});
