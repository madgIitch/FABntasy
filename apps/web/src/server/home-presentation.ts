export type HomeMode = "LIVE" | "RECENT_FINAL" | "DEFAULT";
export type HomeSection = "market" | "games" | "playedGames" | "activity";
export type HeroState = "NO_CALENDAR" | "NOT_SAVED" | "INCOMPLETE" | "READY" | "LOCKED";

const orders: Record<HomeMode, HomeSection[]> = {
  LIVE: ["playedGames", "market", "games", "activity"],
  RECENT_FINAL: ["playedGames", "market", "activity", "games"],
  DEFAULT: ["market", "games", "playedGames", "activity"],
};

export function deriveHomeMode(input: { hasLive: boolean; latestFinishedAt: Date | null; now: Date; recentHours?: number }): HomeMode {
  if (input.hasLive) return "LIVE";
  const horizon = (input.recentHours ?? 24) * 60 * 60 * 1000;
  if (input.latestFinishedAt && input.now.getTime() - input.latestFinishedAt.getTime() >= 0 && input.now.getTime() - input.latestFinishedAt.getTime() <= horizon) return "RECENT_FINAL";
  return "DEFAULT";
}

export function orderHomeSections(mode: HomeMode): HomeSection[] { return orders[mode]; }

export function sportStatus(value: string): string {
  const status=value.trim().toLocaleLowerCase("es-ES");
  if (["no comenzado","scheduled","programado"].includes(status)) return "Próximo";
  if (["comenzado","live","playing","in_progress","en juego","en directo"].includes(status)) return "En directo";
  if (["terminado","finalizado","finished"].includes(status)) return "Final";
  if (["aplazado","postponed"].includes(status)) return "Aplazado";
  return value.trim() || "Estado pendiente";
}

const lowerParticles=new Set(["de","del","la","las","los","y"]);
function titleWords(value:string){return value.toLocaleLowerCase("es-ES").replace(/(^|[\s'’-])([\p{L}])/gu,(_,separator:string,letter:string)=>separator+letter.toLocaleUpperCase("es-ES")).split(" ").map((word,index)=>index>0&&lowerParticles.has(word.toLocaleLowerCase("es-ES"))?word.toLocaleLowerCase("es-ES"):word).join(" ");}
export function displayPersonName(value:string):string{
  const parts=value.split(",");
  if(parts.length!==2||!parts[0].trim()||!parts[1].trim())return value;
  return `${titleWords(parts[1].trim())} ${titleWords(parts[0].trim())}`;
}

export function formatCredits(value:number, formatter:Intl.NumberFormat):string{return formatter.format(value);}

export function formatFreshness(updatedAt: string | null, now: Date, live = false): string {
  if (!updatedAt) return "Actualización pendiente";
  const value = new Date(updatedAt);
  if (Number.isNaN(value.getTime())) return "Actualización pendiente";
  const age = Math.max(0, now.getTime() - value.getTime());
  const minutes = Math.floor(age / 60_000);
  if (live || minutes < 60) {
    if (age < 60_000) return `Actualizado hace ${Math.floor(age / 1_000)} s`;
    return `Actualizado hace ${minutes} min`;
  }
  if (minutes >= 120) return `Datos de hace ${Math.floor(minutes / 60)} h`;
  if (now.toDateString() === value.toDateString()) {
    return `Actualizado ${new Intl.DateTimeFormat("es-ES", { hour:"2-digit", minute:"2-digit", timeZone:"Europe/Madrid" }).format(value)}`;
  }
  return `Datos de hace ${Math.floor(minutes / 60)} h`;
}

export function heroPresentation(input: { state: HeroState; mode: HomeMode; roundNumber: number | null; hasScore: boolean }) {
  if (input.mode === "LIVE") return { title:"Jornada en directo", implication:input.hasScore?"Tus puntos se están actualizando":"Tus puntos aparecerán cuando lleguen las estadísticas", action:"Ver jornada" };
  if (input.mode === "RECENT_FINAL" && input.hasScore) return { title:"Resultado publicado", implication:"Tu jornada ya cuenta para la clasificación", action:"Ver jornada" };
  const copy:Record<HeroState,{title:string;implication:string;action:string}>={
    NOT_SAVED:{title:"Guarda tu quinteto",implication:"Aún no tienes una alineación para esta jornada",action:"Preparar equipo"},
    INCOMPLETE:{title:"Completa tu quinteto",implication:"Te faltan titulares antes del cierre",action:"Preparar equipo"},
    READY:{title:"Tu quinteto está listo",implication:"No necesitas hacer cambios antes del cierre",action:"Revisar equipo"},
    LOCKED:{title:"Alineación bloqueada",implication:"El plazo de cambios ya ha terminado",action:"Ver jornada"},
    NO_CALENDAR:{title:"Calendario pendiente",implication:"Todavía no hay una jornada disponible",action:"Ver competición"},
  };
  return copy[input.state];
}
