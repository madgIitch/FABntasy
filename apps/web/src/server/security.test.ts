import { describe, expect, it } from "vitest";
import { __resetRateLimitsForTests, consumeRateLimit, isSameOrigin, rateLimitClass, redactSensitive, REDACTED } from "./security";

describe("security boundary", () => {
  it("redacts sensitive keys recursively without case distinctions", () => {
    const value = redactSensitive({ Authorization: "Bearer x", nested: [{ PASSWORD: "x", ok: 1 }], vapidPrivateKey: "x", cookie: "x" });
    expect(value).toEqual({ Authorization: REDACTED, nested: [{ PASSWORD: REDACTED, ok: 1 }], vapidPrivateKey: REDACTED, cookie: REDACTED });
  });

  it("uses distinct buckets and returns a bounded retry delay", () => {
    __resetRateLimitsForTests();
    expect(rateLimitClass("/login", "POST")).toBe("auth");
    expect(rateLimitClass("/api/fantasy/team", "PUT")).toBe("sensitive");
    expect(rateLimitClass("/api/sports/games", "GET")).toBe("read");
    let result = consumeRateLimit("auth", "trusted-session", 1000);
    for (let index = 0; index < 10; index += 1) result = consumeRateLimit("auth", "trusted-session", 1000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(900);
  });

  it("rejects cross-site mutations", () => {
    expect(isSameOrigin(new Request("https://app.test/api", { headers: { origin: "https://evil.test" } }))).toBe(false);
    expect(isSameOrigin(new Request("https://app.test/api", { headers: { origin: "https://app.test" } }))).toBe(true);
  });
});
