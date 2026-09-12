const SENSITIVE_KEY = /(?:authorization|cookie|token|password|secret|api[_-]?key|fab[_-]?(?:key|device)|vapid|p256dh|refresh|access[_-]?token|request[_-]?body|raw|payload)/i;

export const REDACTED = "[REDACTED]";

export function redactSensitive(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value as object)) return "[CIRCULAR]";
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, seen));
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactSensitive(item, seen);
  }
  return output;
}

export type RateLimitClass = "auth" | "sensitive" | "read";
const LIMITS: Record<RateLimitClass, { limit: number; windowMs: number }> = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  sensitive: { limit: 30, windowMs: 60_000 },
  read: { limit: 180, windowMs: 60_000 },
};
type Counter = { count: number; resetAt: number };
const counters = new Map<string, Counter>();

export function consumeRateLimit(bucket: RateLimitClass, trustedIdentity: string, now = Date.now()) {
  const policy = LIMITS[bucket];
  const key = `${bucket}:${trustedIdentity}`;
  const previous = counters.get(key);
  const current = !previous || previous.resetAt <= now ? { count: 1, resetAt: now + policy.windowMs } : { ...previous, count: previous.count + 1 };
  counters.set(key, current);
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return { allowed: current.count <= policy.limit, limit: policy.limit, remaining: Math.max(0, policy.limit - current.count), retryAfter };
}

export function rateLimitClass(pathname: string, method: string): RateLimitClass {
  if (/^\/(?:login|registro|recuperar-clave|auth)(?:\/|$)/.test(pathname)) return "auth";
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") return "sensitive";
  return "read";
}

export function isSameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function safeError(error: unknown) {
  return redactSensitive({ name: error instanceof Error ? error.name : "Unknown", code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined });
}

export function __resetRateLimitsForTests() { counters.clear(); }
