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
  if (typeof value !== "string" || !value.startsWith("/app") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return "/app";
  try {
    const parsed = new URL(value, "https://canastio.local");
    if (parsed.origin !== "https://canastio.local" || (parsed.pathname !== "/app" && !parsed.pathname.startsWith("/app/")) || parsed.pathname.split("/").some(part => part === ".." || /%2e/i.test(part))) return "/app";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }
  catch { return "/app"; }
}

export const PUSH_MAX_ATTEMPTS = 3;
export const PUSH_RETRY_DELAYS_MS = [60_000, 300_000, 900_000] as const;
export const PUSH_CLAIM_LEASE_MS = 300_000;
export const PUSH_MAX_RETRY_AFTER_MS = 900_000;

export function pushRetryDelay(attemptCount: number, retryAfterSeconds?: number | null) {
  if (retryAfterSeconds != null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0)
    return Math.min(retryAfterSeconds * 1_000, PUSH_MAX_RETRY_AFTER_MS);
  return PUSH_RETRY_DELAYS_MS[Math.min(Math.max(attemptCount - 1, 0), PUSH_RETRY_DELAYS_MS.length - 1)];
}

export function sanitizedPushError(status?: number) {
  if (status === 404 || status === 410) return `HTTP_${status}`;
  if ([400, 401, 403, 413, 429].includes(status ?? 0)) return `HTTP_${status}`;
  if (status && status >= 500) return "HTTP_5XX";
  return "SEND_FAILED";
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
