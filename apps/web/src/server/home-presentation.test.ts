import { describe, expect, it } from "vitest";
import { deriveHomeMode, displayPersonName, formatFreshness, heroPresentation, orderHomeSections, sportStatus } from "./home-presentation";

describe("home presentation",()=>{
  const now=new Date("2026-09-12T12:00:00Z");
  it("uses three stable contextual modes with explicit ordering",()=>{
    expect(deriveHomeMode({hasLive:true,latestFinishedAt:null,now})).toBe("LIVE");
    expect(deriveHomeMode({hasLive:false,latestFinishedAt:new Date("2026-09-11T12:00:00Z"),now})).toBe("RECENT_FINAL");
    expect(deriveHomeMode({hasLive:false,latestFinishedAt:new Date("2026-09-11T11:59:59Z"),now})).toBe("DEFAULT");
    expect(orderHomeSections("DEFAULT")).toEqual(["market","games","playedGames","activity"]);
    expect(orderHomeSections("LIVE")).toEqual(["playedGames","market","games","activity"]);
    expect(orderHomeSections("RECENT_FINAL")).toEqual(["playedGames","market","activity","games"]);
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
  it("formats normal, recent, stale and unknown freshness from an injected clock",()=>{
    expect(formatFreshness("2026-09-12T11:59:28Z",now,true)).toBe("Actualizado hace 32 s");
    expect(formatFreshness("2026-09-12T11:30:00Z",now)).toBe("Actualizado hace 30 min");
    expect(formatFreshness("2026-09-12T09:00:00Z",now)).toBe("Datos de hace 3 h");
    expect(formatFreshness(null,now)).toBe("Actualización pendiente");
  });
  it("gives every priority state context, implication and one valid action",()=>{
    expect(heroPresentation({state:"INCOMPLETE",mode:"DEFAULT",roundNumber:4,hasScore:false})).toEqual({title:"Completa tu quinteto",implication:"Te faltan titulares antes del cierre",action:"Preparar equipo"});
    expect(heroPresentation({state:"READY",mode:"LIVE",roundNumber:4,hasScore:true}).title).toBe("Jornada en directo");
    expect(heroPresentation({state:"LOCKED",mode:"RECENT_FINAL",roundNumber:4,hasScore:true}).title).toBe("Resultado publicado");
    expect(heroPresentation({state:"NO_CALENDAR",mode:"DEFAULT",roundNumber:null,hasScore:false}).action).toBe("Ver competición");
  });
});
