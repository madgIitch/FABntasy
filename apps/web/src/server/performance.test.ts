import { afterEach, describe, expect, it, vi } from "vitest";
import { cached, cacheTags, clearPerformanceCache, invalidateCache, privateCacheKey } from "./performance";

describe("server performance cache", () => {
  afterEach(() => { clearPerformanceCache(); delete process.env.CANASTIO_SERVER_CACHE_ENABLED; vi.restoreAllMocks(); });
  it("isolates private keys by actor and league without exposing either value", () => {
    const key = privateCacheKey("ranking", { actorAuthUserId: "user@example.test", leagueId: "private-league" });
    expect(key).not.toContain("user@example.test"); expect(key).not.toContain("private-league");
    expect(key).not.toBe(privateCacheKey("ranking", { actorAuthUserId: "other", leagueId: "private-league" }));
    expect(key).not.toBe(privateCacheKey("ranking", { actorAuthUserId: "user@example.test", leagueId: "other" }));
  });
  it("coalesces concurrent misses and invalidates only matching league tags", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    let loads = 0; const load = async () => ++loads;
    const a = privateCacheKey("market", { actorAuthUserId: "a", leagueId: "league-a" });
    const b = privateCacheKey("market", { actorAuthUserId: "a", leagueId: "league-b" });
    expect(await Promise.all(Array.from({ length: 20 }, () => cached("market", a, cacheTags({ leagueId: "league-a" }), load)))).toEqual(Array(20).fill(1));
    await cached("market", b, cacheTags({ leagueId: "league-b" }), load);
    invalidateCache(cacheTags({ leagueId: "league-a" }));
    expect(await cached("market", a, cacheTags({ leagueId: "league-a" }), load)).toBe(3);
    expect(await cached("market", b, cacheTags({ leagueId: "league-b" }), load)).toBe(2);
  });
  it("supports a lossless bypass", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined); process.env.CANASTIO_SERVER_CACHE_ENABLED = "false";
    let loads = 0; const key = privateCacheKey("home", { actorAuthUserId: "a", leagueId: "l" });
    await cached("home", key, [], async () => ++loads); await cached("home", key, [], async () => ++loads);
    expect(loads).toBe(2);
  });
  it("does not publish an in-flight value invalidated before its load commits", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    let release!: (value: number) => void; let loads = 0;
    const deferred = new Promise<number>((resolve) => { release = resolve; });
    const key = privateCacheKey("ranking", { actorAuthUserId: "a", leagueId: "league-a" });
    const first = cached("ranking", key, cacheTags({ leagueId: "league-a" }), async () => { loads++; return deferred; });
    invalidateCache(cacheTags({ leagueId: "league-a" })); release(1);
    expect(await first).toBe(1);
    expect(await cached("ranking", key, cacheTags({ leagueId: "league-a" }), async () => ++loads)).toBe(2);
  });
});
