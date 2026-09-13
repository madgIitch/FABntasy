export const OBSERVABILITY_SCHEMA = "canastio.observability.v1" as const;
export type Component = "FAB" | "POSTGRESQL" | "WEB" | "INGESTOR" | "CLIENT";
export type ErrorCategory = "FAB_AUTH" | "FAB_TRANSPORT" | "DATABASE" | "WEB_APPLICATION" | "INGESTOR_FAILURE" | "CLIENT_ERROR" | "THRESHOLD" | "NONE";
export type Signal = { schemaVersion: typeof OBSERVABILITY_SCHEMA; timestamp: string; release: string; environment: string; component: Component; operation: string; result: "SUCCESS" | "ERROR" | "DEGRADED" | "RECOVERED"; errorCategory: ErrorCategory; correlationId?: string; dimensions?: Record<string, string | number | boolean>; count: number; firstSeenAt: string; lastSeenAt: string };
export interface SignalSink { write(signal: Signal): void | Promise<void> }

const FORBIDDEN = /(token|cookie|password|secret|authorization|credential|fab.?key|device.?id|dsn|database.?url|body|payload|raw|email|user.?id|league.?name|private.?name|stack|query)/i;
const SAFE_DIMENSIONS = new Set(["route", "method", "status", "jobType", "severity", "threshold", "durationBucket"]);
const OPS = /^[a-z][a-z0-9_.-]{0,63}$/;
export function redact(input: Record<string, unknown> = {}) {
  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) if (!FORBIDDEN.test(key) && SAFE_DIMENSIONS.has(key) && ["string", "number", "boolean"].includes(typeof value)) output[key] = typeof value === "string" ? value.slice(0, 80).replace(/[?&].*$/, "") : value as number | boolean;
  return output;
}
export function classifyError(origin: Component): ErrorCategory { return ({ FAB: "FAB_TRANSPORT", POSTGRESQL: "DATABASE", WEB: "WEB_APPLICATION", INGESTOR: "INGESTOR_FAILURE", CLIENT: "CLIENT_ERROR" } as const)[origin]; }
export class MemorySink implements SignalSink { readonly signals: Signal[] = []; write(signal: Signal) { this.signals.push(structuredClone(signal)); } }
export class Observability {
  private groups = new Map<string, Signal>();
  constructor(private sink?: SignalSink, private enabled = true, private now = () => new Date(), private release = process.env.CANASTIO_RELEASE ?? "dev", private environment = process.env.NODE_ENV ?? "development") {}
  emit(input: Omit<Signal, "schemaVersion" | "timestamp" | "release" | "environment" | "count" | "firstSeenAt" | "lastSeenAt">) {
    if (!this.enabled || !this.sink || !OPS.test(input.operation)) return;
    const timestamp = this.now().toISOString(), key = [input.component, input.operation, input.errorCategory, this.release].join(":");
    const prior = this.groups.get(key); const signal: Signal = { ...input, dimensions: redact(input.dimensions), schemaVersion: OBSERVABILITY_SCHEMA, timestamp, release: this.release.slice(0, 64), environment: this.environment.slice(0, 32), count: (prior?.count ?? 0) + 1, firstSeenAt: prior?.firstSeenAt ?? timestamp, lastSeenAt: timestamp };
    this.groups.set(key, signal); try { void Promise.resolve(this.sink.write(signal)).catch(() => undefined); } catch { /* telemetry must never affect product paths */ }
  }
}
export const noopObservability = new Observability(undefined, false);
export const USAGE_EVENTS = new Set(["page_view", "feedback_opened", "feedback_submitted"]);
export function stableClientSignature(errorName: string, operation: string, release: string) { let hash = 2166136261; for (const char of `${errorName}:${operation}:${release}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return `client-${(hash >>> 0).toString(16)}`; }
