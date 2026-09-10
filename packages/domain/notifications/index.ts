export const NOTIFICATION_GROUPS = {
  Mercado: ["MARKET_PRICE", "MARKET_OFFER", "MARKET_OUTBID", "MARKET_SOLD"],
  "Mi equipo": ["TEAM_INJURY", "TEAM_CUTOFF", "TEAM_LINEUP"],
  Liga: ["LEAGUE_CLAUSE", "LEAGUE_ACTIVITY", "LEAGUE_MESSAGE"],
  Jornada: ["ROUND_START", "ROUND_RESULT"],
} as const;

export const NOTIFICATION_INTENTS = Object.values(NOTIFICATION_GROUPS).flat();
export type NotificationIntent = (typeof NOTIFICATION_INTENTS)[number];

export function isNotificationIntent(value: unknown): value is NotificationIntent {
  return typeof value === "string" && (NOTIFICATION_INTENTS as readonly string[]).includes(value);
}

export function safeNotificationDestination(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/app") || value.startsWith("//") || value.includes("\\")) return "/app";
  try { const parsed = new URL(value, "https://canastio.local"); return parsed.origin === "https://canastio.local" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/app"; }
  catch { return "/app"; }
}

export function notificationEventKey(userId: string, intent: NotificationIntent, domainEventId: string) {
  return `${userId}:${intent}:${domainEventId}`;
}

export function lineupReminderEligibility(input: { now: Date; cutoffAt: Date; lineupValid: boolean; windowMinutes: number }) {
  if (input.lineupValid || input.now >= input.cutoffAt) return false;
  const remaining = input.cutoffAt.getTime() - input.now.getTime();
  return remaining <= input.windowMinutes * 60_000;
}

export function lineupReminderEventId(leagueId: string, roundNumber: number, kind: "TEAM_CUTOFF" | "TEAM_LINEUP") {
  return `${kind.toLowerCase()}:${leagueId}:round:${roundNumber}:Europe/Madrid`;
}

export function roundResultEventId(leagueId: string, roundNumber: number, revision: number, published: boolean) {
  if (!published) return null;
  return `round-result:${leagueId}:round:${roundNumber}:revision:${revision}`;
}
