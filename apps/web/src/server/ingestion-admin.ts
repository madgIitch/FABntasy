import { db } from "./db";

export class AdminError extends Error { constructor(public code: string, public status = 400) { super(code); } }
export const JOB_TYPES = ["COMPETITION", "ROUND", "GAME"] as const;
const SECRET_KEY = /(^|_)(key|id_dispositivo|authorization|cookie|token|password|secret)($|_)/i;
const MAX_RAW_BYTES = 256 * 1024;

export function redactRaw(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactRaw);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, SECRET_KEY.test(key) ? "[REDACTED]" : redactRaw(child)]));
  return value;
}

export function boundedRaw(value: unknown) {
  const redacted = redactRaw(value), serialized = JSON.stringify(redacted);
  if (Buffer.byteLength(serialized) <= MAX_RAW_BYTES) return { payload: redacted, truncated: false };
  return { payload: serialized.slice(0, MAX_RAW_BYTES), truncated: true };
}

export function classifyIngestionError(code: string | null) {
  if (!code) return null;
  if (/AUTH|CREDENTIAL|FAB_RESPONSE/.test(code)) return "FAB_AUTH";
  if (/TIMEOUT|NETWORK|RATE/.test(code)) return "NETWORK";
  if (/NORMAL|BOX_SCORE|INCOMPLETE|INVALID_DATA/.test(code)) return "NORMALIZATION";
  if (/DB|DATABASE|PRISMA|TRANSACTION/.test(code)) return "DATABASE";
  return "INVALID_DATA";
}

export async function requireIngestionAdmin(authUserId: string) {
  const profile = await db.userProfile.findUnique({ where: { authUserId }, select: { id: true, adminGrants: { where: { role: "INGESTION_ADMIN", revokedAt: null }, take: 1, select: { id: true } } } });
  if (!profile?.adminGrants.length) throw new AdminError("NOT_FOUND", 404);
  return profile.id;
}

export function parseJob(input: unknown) {
  const value = input as { type?: unknown; target?: Record<string, unknown>; reason?: unknown };
  if (!JOB_TYPES.includes(value?.type as typeof JOB_TYPES[number]) || !value.target || typeof value.target !== "object") throw new AdminError("INVALID_JOB");
  const required = value.type === "COMPETITION" || value.type === "ROUND" ? "categoryId" : "gameId";
  const id = value.target[required], roundNumber = value.type === "ROUND" ? value.target.roundNumber : undefined;
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,191}$/.test(id)) throw new AdminError("INVALID_TARGET");
  if (value.type === "ROUND" && (!Number.isInteger(roundNumber) || Number(roundNumber) < 1 || Number(roundNumber) > 99)) throw new AdminError("INVALID_TARGET");
  const target = value.type === "ROUND" ? { categoryId: id, roundNumber: Number(roundNumber) } : { [required]: id };
  return { type: value.type as typeof JOB_TYPES[number], target, targetKey: value.type === "ROUND" ? `categoryId:${id}:round:${roundNumber}` : `${required}:${id}`, reason: typeof value.reason === "string" ? value.reason.trim().slice(0, 240) : null };
}

export async function enqueueIngestionJob(actorProfileId: string, input: unknown) {
  const job = parseJob(input), key = `${job.type}:${job.targetKey}`;
  try {
    return await db.$transaction(async tx => {
      const created = await tx.ingestionJob.create({ data: { type: job.type, target: job.target, targetKey: job.targetKey, idempotencyKey: key, requestedById: actorProfileId } });
      await tx.adminAuditEvent.create({ data: { actorProfileId, action: "INGESTION_JOB_ENQUEUE", resourceType: "INGESTION_JOB", resourceId: created.id, result: "SUCCESS", reason: job.reason } });
      return { job: created, duplicate: false };
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    const existing = await db.ingestionJob.findFirst({ where: { type: job.type, targetKey: job.targetKey, status: { in: ["QUEUED", "RUNNING"] } }, orderBy: { requestedAt: "desc" } });
    if (!existing) throw error;
    await db.adminAuditEvent.create({ data: { actorProfileId, action: "INGESTION_JOB_ENQUEUE", resourceType: "INGESTION_JOB", resourceId: existing.id, result: "DUPLICATE", reason: job.reason } });
    return { job: existing, duplicate: true };
  }
}

export async function getIngestionDashboard(actorProfileId: string, filters: { status?: string; type?: string; competitionSeasonId?: string } = {}) {
  const statuses = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"];
  const jobWhere = { ...(statuses.includes(filters.status ?? "") ? { status: filters.status } : {}), ...(JOB_TYPES.includes(filters.type as typeof JOB_TYPES[number]) ? { type: filters.type } : {}) };
  const competitionSeasonId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(filters.competitionSeasonId ?? "") ? filters.competitionSeasonId : undefined;
  const [jobs, runs, heartbeat, lastSuccess] = await Promise.all([
    db.ingestionJob.findMany({ where: jobWhere, orderBy: { requestedAt: "desc" }, take: 50, include: { requestedBy: { select: { username: true, displayName: true } } } }),
    db.ingestionRun.findMany({ where: competitionSeasonId ? { competitionSeasonId } : {}, orderBy: { startedAt: "desc" }, take: 50, include: { competitionSeason: { select: { id: true, name: true, competition: { select: { name: true } } } } } }),
    db.ingestionHeartbeat.findFirst({ orderBy: { seenAt: "desc" } }),
    db.ingestionRun.findFirst({ where: { status: "SUCCEEDED" }, orderBy: { finishedAt: "desc" } }),
  ]);
  const now = Date.now(), age = heartbeat ? now - heartbeat.seenAt.getTime() : Infinity;
  const health = age <= 5 * 60_000 ? "HEALTHY" : age <= 20 * 60_000 ? "DEGRADED" : "STALE";
  const visibleJobs = jobs.map(job => ({ ...job, effectiveStatus: job.status === "RUNNING" && (!job.heartbeatAt || now - job.heartbeatAt.getTime() > 20 * 60_000) ? "STALE" : job.status }));
  return { actorProfileId, health, heartbeat, lastSuccess, jobs: visibleJobs, runs: runs.map(run => ({ ...run, errorCategory: classifyIngestionError(run.errorCode) })) };
}

export async function listRawPayloads() {
  const since = new Date(Date.now() - 30 * 86400_000);
  return db.rawFabPayload.findMany({ where: { retrievedAt: { gte: since } }, orderBy: { retrievedAt: "desc" }, take: 100, select: { id: true, endpoint: true, entityType: true, externalId: true, retrievedAt: true, httpStatus: true, checksum: true } });
}

export async function getRawPayload(actorProfileId: string, id: string) {
  const raw = await db.rawFabPayload.findUnique({ where: { id } });
  if (!raw) throw new AdminError("RAW_NOT_FOUND", 404);
  await db.adminAuditEvent.create({ data: { actorProfileId, action: "RAW_VIEW", resourceType: "RAW_FAB_PAYLOAD", resourceId: id, result: "SUCCESS" } });
  return { id: raw.id, endpoint: raw.endpoint, entityType: raw.entityType, externalId: raw.externalId, retrievedAt: raw.retrievedAt, httpStatus: raw.httpStatus, checksum: raw.checksum, ...boundedRaw(raw.payload) };
}
