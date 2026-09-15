export const SOCIAL_LEAGUE_SCHEMA_VERSION = "social-league-api.v1" as const;
export const SOCIAL_EVENT_PAYLOAD_VERSION = 1 as const;
export const SOCIAL_RULES_VERSION = "social-rules.v1" as const;

export const LEAGUE_EVENT_TYPES = [
  "PLAYER_BOUGHT", "PLAYER_SOLD", "CLAUSE_EXECUTED", "PLAYER_PROTECTED",
  "PRICE_CHANGED", "MEMBER_JOINED", "ROUND_PUBLISHED", "ROUND_WINNER",
  "RANK_CHANGED", "RECORD_SET", "ACHIEVEMENT_EARNED",
] as const;
export type LeagueEventType = typeof LEAGUE_EVENT_TYPES[number];

export const REACTION_CATALOG = ["😂", "🔥", "👀", "💀", "🤡"] as const;
export type LeagueReactionEmoji = typeof REACTION_CATALOG[number];
export const isLeagueEventType = (value: unknown): value is LeagueEventType =>
  typeof value === "string" && (LEAGUE_EVENT_TYPES as readonly string[]).includes(value);
export const isLeagueReaction = (value: unknown): value is LeagueReactionEmoji =>
  typeof value === "string" && (REACTION_CATALOG as readonly string[]).includes(value);

export type SocialEventPayload = {
  version: 1;
  actorName?: string;
  affectedName: string;
  affectedManagerName?: string;
  magnitude?: number;
  unit?: "credits" | "points" | "places";
  destination: string;
  revision?: number;
  backfill?: boolean;
};

export function encodeActivityCursor(occurredAt: Date, id: string) {
  return Buffer.from(JSON.stringify([occurredAt.toISOString(), id]), "utf8").toString("base64url");
}
export function decodeActivityCursor(value?: string | null): { occurredAt: Date; id: string } | null {
  if (!value) return null;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!Array.isArray(decoded) || decoded.length !== 2 || typeof decoded[0] !== "string" || typeof decoded[1] !== "string") return null;
    const occurredAt = new Date(decoded[0]);
    return Number.isNaN(occurredAt.getTime()) ? null : { occurredAt, id: decoded[1] };
  } catch { return null; }
}

export function sharedRoundRange(left: number[], right: number[]) {
  const shared = [...new Set(left)].filter(round => right.includes(round)).sort((a, b) => a - b);
  return shared.length ? { from: shared[0], to: shared[shared.length - 1], rounds: shared } : null;
}

export function rivalryReason(input: { positionGap: number; pointsGap: number; sharedRounds: number }) {
  if (input.sharedRounds < 3 || input.positionGap > 2 || input.pointsGap > 25) return null;
  return `Separados por ${input.positionGap} puesto${input.positionGap === 1 ? "" : "s"} y ${input.pointsGap.toFixed(1)} puntos durante ${input.sharedRounds} jornadas compartidas.`;
}

export function orderedLiveRevision<T extends { revision: number }>(current: T | null, incoming: T): T {
  return !current || incoming.revision >= current.revision ? incoming : current;
}
