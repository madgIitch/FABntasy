import { createHash } from "node:crypto";

export type PerformanceOperation = "home" | "market" | "ranking" | "publish";
export type CacheState = "hit" | "miss" | "bypass" | "error";
type Entry = { value: unknown; expiresAt: number; tags: ReadonlySet<string> };
const entries = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();
const tagVersions = new Map<string, number>();
const ttlMs = () => Math.max(1_000, Number(process.env.CANASTIO_CACHE_TTL_MS ?? 15_000));
export const cacheEnabled = () => process.env.CANASTIO_SERVER_CACHE_ENABLED !== "false";
const opaque = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 16);

/** Inputs must be identities resolved by server-side authorization. */
export function privateCacheKey(operation: Exclude<PerformanceOperation, "publish">, input: { actorAuthUserId: string; leagueId: string; revision?: string | number; variant?: string }) {
  return [operation, `actor:${opaque(input.actorAuthUserId)}`, `league:${opaque(input.leagueId)}`, `revision:${input.revision ?? "current"}`, `variant:${opaque(input.variant ?? "default")}`].join("|");
}
export function cacheTags(input: { leagueId: string; roundNumber?: number; revision?: string | number }) {
  return [`league:${input.leagueId}`, input.roundNumber === undefined ? "" : `round:${input.leagueId}:${input.roundNumber}`, input.revision === undefined ? "" : `revision:${input.leagueId}:${input.roundNumber ?? "all"}:${input.revision}`].filter(Boolean);
}
function metric(operation: PerformanceOperation, result: "ok" | "error", cache: CacheState, started: number) {
  console.info(JSON.stringify({ event: "server_operation", operation, result, cache, durationMs: Math.round((performance.now() - started) * 100) / 100 }));
}
export async function cached<T>(operation: Exclude<PerformanceOperation, "publish">, key: string, tags: string[], load: () => Promise<T>): Promise<T> {
  const started = performance.now();
  if (!cacheEnabled()) { try { const value = await load(); metric(operation, "ok", "bypass", started); return value; } catch (error) { metric(operation, "error", "bypass", started); throw error; } }
  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) { metric(operation, "ok", "hit", started); return hit.value as T; }
  if (hit) entries.delete(key);
  try {
    const inFlight = pending.get(key) as Promise<T> | undefined;
    const value = await (inFlight ?? (() => { const versions = new Map(tags.map((tag) => [tag, tagVersions.get(tag) ?? 0])); const work = load().then((loaded) => { if (tags.every((tag) => (tagVersions.get(tag) ?? 0) === versions.get(tag))) entries.set(key, { value: loaded, expiresAt: Date.now() + ttlMs(), tags: new Set(tags) }); return loaded; }); pending.set(key, work); work.finally(() => pending.delete(key)).catch(() => undefined); return work; })());
    metric(operation, "ok", inFlight ? "hit" : "miss", started); return value;
  } catch (error) { metric(operation, "error", "error", started); throw error; }
}
export function invalidateCache(tags: string[]) { const wanted = new Set(tags); for (const tag of wanted) tagVersions.set(tag, (tagVersions.get(tag) ?? 0) + 1); for (const [key, entry] of entries) if ([...entry.tags].some((tag) => wanted.has(tag))) entries.delete(key); }
export function clearPerformanceCache() { entries.clear(); pending.clear(); tagVersions.clear(); }
export async function measured<T>(operation: PerformanceOperation, work: () => Promise<T>) { const started = performance.now(); try { const value = await work(); metric(operation, "ok", "bypass", started); return value; } catch (error) { metric(operation, "error", "bypass", started); throw error; } }
