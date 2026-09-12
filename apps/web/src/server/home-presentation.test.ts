import { describe, expect, it } from "vitest";
import { deriveHomeMode, displayPersonName, orderHomeSections, sportStatus } from "./home-presentation";

describe("home presentation",()=>{
  const now=new Date("2026-09-12T12:00:00Z");
  it("uses three stable contextual modes with explicit ordering",()=>{
    expect(deriveHomeMode({hasLive:true,latestFinishedAt:null,now})).toBe("LIVE");
    expect(deriveHomeMode({hasLive:false,latestFinishedAt:new Date("2026-09-11T12:00:00Z"),now})).toBe("RECENT_FINAL");
    expect(deriveHomeMode({hasLive:false,latestFinishedAt:new Date("2026-09-11T11:59:59Z"),now})).toBe("DEFAULT");
    expect(orderHomeSections("DEFAULT")).toEqual(["market","games","playedGames","activity"]);
  });
  it("translates FAB statuses without losing unknown values",()=>{
    expect(sportStatus("No comenzado")).toBe("Próximo");
    expect(sportStatus("COMENZADO")).toBe("En directo");
    expect(sportStatus("Terminado")).toBe("Final");
    expect(sportStatus("Suspendido")).toBe("Suspendido");
  });
  it("humanizes unequivocal player names and preserves ambiguous names",()=>{
    expect(displayPersonName("CHAÍN ROLDÁN, MARIO")).toBe("Mario Chaín Roldán");
    expect(displayPersonName("GARCIA-TREVIJANO, GUILLERMO")).toBe("Guillermo Garcia-Trevijano");
    expect(displayPersonName("CLUB NAUTICO SEVILLA")).toBe("CLUB NAUTICO SEVILLA");
    expect(displayPersonName("APELLIDO, NOMBRE, EXTRA")).toBe("APELLIDO, NOMBRE, EXTRA");
  });
});
