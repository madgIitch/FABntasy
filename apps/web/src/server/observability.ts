import { db } from "./db";
import { ErrorCategory, Observability, SignalSink } from "../lib/observability";

export const THRESHOLDS = { heartbeatMs: 10 * 60_000, stalledMs: 15 * 60_000, backlog: 20, backlogMs: 10 * 60_000, errorRate: 0.02, errorRateMs: 5 * 60_000, latencyMs: 10 * 60_000 } as const;
export type Health = "HEALTHY" | "DEGRADED" | "CRITICAL";
export type HealthInput = { now: Date; heartbeatAt?: Date | null; runningHeartbeatAt?: Date | null; queuedCount: number; oldestQueuedAt?: Date | null; errorRate: number; errorWindowMs: number; p95OverBudget: boolean; latencyWindowMs: number };
export function evaluateHealth(value: HealthInput): { health: Health; reasons: string[] } {
  const reasons: string[] = [];
  if (!value.heartbeatAt || value.now.getTime() - value.heartbeatAt.getTime() > THRESHOLDS.heartbeatMs) reasons.push("HEARTBEAT_STALE");
  if (value.runningHeartbeatAt && value.now.getTime() - value.runningHeartbeatAt.getTime() > THRESHOLDS.stalledMs) reasons.push("JOB_STALLED");
  if (value.queuedCount > THRESHOLDS.backlog && value.oldestQueuedAt && value.now.getTime() - value.oldestQueuedAt.getTime() > THRESHOLDS.backlogMs) reasons.push("BACKLOG_HIGH");
  if (value.errorRate > THRESHOLDS.errorRate && value.errorWindowMs >= THRESHOLDS.errorRateMs) reasons.push("ERROR_RATE_HIGH");
  if (value.p95OverBudget && value.latencyWindowMs >= THRESHOLDS.latencyMs) reasons.push("P95_OVER_BUDGET");
  return { health: reasons.some(reason => reason === "HEARTBEAT_STALE" || reason === "JOB_STALLED") && reasons.length > 1 ? "CRITICAL" : reasons.length ? "DEGRADED" : "HEALTHY", reasons };
}
export async function getObservabilityStatus(now = new Date()) {
  const since = new Date(now.getTime() - 10 * 60_000);
  const [heartbeat, lastSuccess, failed, running, queued, recentRuns] = await Promise.all([
    db.ingestionHeartbeat.findFirst({ orderBy: { seenAt: "desc" } }), db.ingestionRun.findFirst({ where: { status: "SUCCEEDED" }, orderBy: { finishedAt: "desc" } }),
    db.ingestionJob.count({ where: { status: "FAILED" } }), db.ingestionJob.findFirst({ where: { status: "RUNNING" }, orderBy: { heartbeatAt: "asc" } }),
    db.ingestionJob.findMany({ where: { status: "QUEUED" }, orderBy: { requestedAt: "asc" }, select: { requestedAt: true } }), db.ingestionRun.findMany({ where: { startedAt: { gte: since } }, select: { status: true, startedAt: true, finishedAt: true } }),
  ]);
  const errors = recentRuns.filter(run => run.status === "FAILED").length, errorRate = recentRuns.length ? errors / recentRuns.length : 0;
  const latencies = recentRuns.flatMap(run => run.finishedAt ? [run.finishedAt.getTime() - run.startedAt.getTime()] : []).sort((a,b)=>a-b); const p95 = latencies.length ? latencies[Math.ceil(latencies.length * .95) - 1] : null;
  const result = evaluateHealth({ now, heartbeatAt: heartbeat?.seenAt, runningHeartbeatAt: running?.heartbeatAt ?? running?.startedAt, queuedCount: queued.length, oldestQueuedAt: queued[0]?.requestedAt, errorRate, errorWindowMs: 10 * 60_000, p95OverBudget: p95 !== null && p95 > 1_500, latencyWindowMs: 10 * 60_000 });
  return { schemaVersion: "canastio.status.v1", ...result, generatedAt: now, lastValidSignalAt: heartbeat?.seenAt ?? lastSuccess?.finishedAt ?? null, freshness: heartbeat ? now.getTime() - heartbeat.seenAt.getTime() > THRESHOLDS.heartbeatMs ? "STALE" : "FRESH" : "EMPTY", partial: false, heartbeatAt: heartbeat?.seenAt ?? null, lastSuccessAt: lastSuccess?.finishedAt ?? null, failedJobs: failed, blockedJobs: running && (!running.heartbeatAt || now.getTime()-running.heartbeatAt.getTime()>THRESHOLDS.stalledMs) ? 1 : 0, backlog: queued.length, errorRate, components: [{ component: "INGESTOR", p95Ms: p95, errorRate }] };
}
export function serverObservability(sink?: SignalSink) { return new Observability(sink, process.env.CANASTIO_ERROR_TRACKING_ENABLED === "true"); }
export function emitOperational(obs: Observability, operation: string, category: ErrorCategory, result: "ERROR"|"DEGRADED"|"RECOVERED") { obs.emit({ component: "WEB", operation, result, errorCategory: category }); }

export const PUSH_THRESHOLDS = { failureRate: 0.1, failureWindowMs: 15 * 60_000, oldestBacklogMs: 10 * 60_000, expiredEndpoints: 5, expiredWindowMs: 15 * 60_000 } as const;
export function evaluatePushHealth(input:{failureRate:number;windowMs:number;oldestBacklogMs:number;expiredEndpoints:number}) {
  const alerts:string[]=[];
  if(input.windowMs>=PUSH_THRESHOLDS.failureWindowMs&&input.failureRate>PUSH_THRESHOLDS.failureRate)alerts.push("PUSH_FAILURE_RATE_HIGH");
  if(input.oldestBacklogMs>PUSH_THRESHOLDS.oldestBacklogMs)alerts.push("PUSH_BACKLOG_OLD");
  if(input.windowMs>=PUSH_THRESHOLDS.expiredWindowMs&&input.expiredEndpoints>=PUSH_THRESHOLDS.expiredEndpoints)alerts.push("PUSH_ENDPOINTS_EXPIRED");
  return {health:alerts.length?"DEGRADED" as const:"HEALTHY" as const,alerts};
}
export async function getPushMetrics(now=new Date()){
  const since=new Date(now.getTime()-PUSH_THRESHOLDS.failureWindowMs);
  const [byResult,pending,expiredEndpoints]=await Promise.all([
    db.notificationDelivery.groupBy({by:["status"],where:{lastAttemptAt:{gte:since}},_count:{_all:true}}),
    db.notificationDelivery.findMany({where:{status:{in:["PENDING","RETRYABLE"]}},select:{createdAt:true},orderBy:{createdAt:"asc"}}),
    db.pushSubscription.count({where:{revokedAt:{gte:since},revokedReason:"EXPIRED"}}),
  ]);
  const counts=Object.fromEntries(byResult.map(row=>[row.status,row._count._all]));
  const attempted=byResult.reduce((sum,row)=>sum+row._count._all,0),failed=(counts.FAILED??0)+(counts.EXPIRED??0);
  const ages=pending.map(row=>now.getTime()-row.createdAt.getTime()),backlog={under5m:ages.filter(age=>age<300_000).length,from5to15m:ages.filter(age=>age>=300_000&&age<900_000).length,over15m:ages.filter(age=>age>=900_000).length};
  const oldestBacklogMs=ages.length?Math.max(...ages):0,failureRate=attempted?failed/attempted:0;
  return {schemaVersion:"push.metrics.v1",windowMinutes:15,deliveriesByResult:counts,failureRate,backlog,expiredEndpoints,...evaluatePushHealth({failureRate,windowMs:PUSH_THRESHOLDS.failureWindowMs,oldestBacklogMs,expiredEndpoints})};
}
