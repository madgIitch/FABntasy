export type HomeMode = "LIVE" | "RECENT_FINAL" | "DEFAULT";
export type HomeSection = "market" | "games" | "playedGames" | "activity";

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
