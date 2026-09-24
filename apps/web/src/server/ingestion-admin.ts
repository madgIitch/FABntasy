import { Prisma } from "@prisma/client";
import { db } from "./db";

export class AdminError extends Error { constructor(public code: string, public status = 400) { super(code); } }
export const JOB_TYPES = ["COMPETITION", "ROUND", "GAME"] as const;
export const RECENT_CATALOG_ORDER: Prisma.FabCompetitionCatalogOrderByWithRelationInput[] = [
  { lastChangedAt: "desc" },
  { categoryCompetitionId: "asc" },
];
export const TEAM_INDEX_COVERAGE = ["COMPLETE", "PARTIAL", "NOT_SYNCED", "STALE", "FAILED"] as const;
export type TeamIndexCoverageStatus = typeof TEAM_INDEX_COVERAGE[number];
export type RosterCoverageStatus = TeamIndexCoverageStatus | "PLANTILLA_NO_DISPONIBLE";
export type CompetitionTeamIndex = {
  catalogId: string;
  competitionSeasonId: string | null;
  coverageStatus: TeamIndexCoverageStatus;
  calculatedAt: string;
  teamsLastSyncedAt: string | null;
  playersLastSyncedAt: string | null;
  rosterCoverageStatus: RosterCoverageStatus;
  rosterLastSyncedAt: string | null;
  rosterRegistrationCount: number | null;
  tentativeRegistrationCount: number | null;
  ambiguousCount: number;
  teamCount: number | null;
  playerRegistrationCount: number | null;
  teams: Array<{ teamId: string; teamName: string; playerRegistrationCount: number }>;
};
type TeamIndexRow = { catalogId: string; competitionSeasonId: string; teamId: string | null; teamName: string | null; playerRegistrationCount: bigint | number; rosterRegistrationCount?: bigint | number; tentativeRegistrationCount?: bigint | number };
type CoverageRun = { competitionSeasonId: string | null; jobName: string; status: string; startedAt: Date; finishedAt: Date | null; counters?: unknown };
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

const STALE_AFTER_MS = 24 * 60 * 60_000;
const successful = (status: string) => status.toLowerCase() === "succeeded";
const failed = (status: string) => status.toLowerCase() === "failed";
const iso = (value: Date | null | undefined) => value ? value.toISOString() : null;
const normalizedTeamName = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

export function buildCompetitionTeamIndexes(
  catalog: Array<{ id: string; competitionSeasonId: string | null; status: string }>,
  rows: TeamIndexRow[],
  runs: CoverageRun[],
  calculatedAt = new Date(),
): CompetitionTeamIndex[] {
  return catalog.map(item => {
    const seasonRows = rows.filter(row => row.catalogId === item.id && row.teamId && row.teamName).map(row => ({
      teamId: row.teamId!, teamName: row.teamName!, playerRegistrationCount: Number(row.playerRegistrationCount),
    })).sort((a, b) => normalizedTeamName(a.teamName).localeCompare(normalizedTeamName(b.teamName), "es") || a.teamId.localeCompare(b.teamId));
    const seasonRuns = runs.filter(run => run.competitionSeasonId === item.competitionSeasonId)
      .sort((a, b) => (b.finishedAt ?? b.startedAt).getTime() - (a.finishedAt ?? a.startedAt).getTime());
    const teamRuns = seasonRuns.filter(run => run.jobName === "competition");
    const playerRuns = seasonRuns.filter(run => run.jobName === "stats");
    const rosterRuns = seasonRuns.filter(run => run.jobName === "roster");
    const latestTeamRun = teamRuns[0];
    const lastTeamSuccess = teamRuns.find(run => successful(run.status));
    const lastPlayerSuccess = playerRuns.find(run => successful(run.status));
    const latestRosterRun = rosterRuns[0];
    const lastRosterSuccess = rosterRuns.find(run => successful(run.status));
    const rosterCounters = (lastRosterSuccess?.counters ?? {}) as Record<string, unknown>;
    const unavailable = Number(rosterCounters.unavailable ?? rosterCounters.rosterUnavailable ?? 0);
    const ambiguous = Number(rosterCounters.ambiguous ?? rosterCounters.rosterAmbiguous ?? 0);
    const rosterObserved = Number(rosterCounters.observed ?? rosterCounters.rosterObserved ?? 0);
    let rosterCoverageStatus: RosterCoverageStatus = "NOT_SYNCED";
    if (latestRosterRun && failed(latestRosterRun.status)) rosterCoverageStatus = "FAILED";
    else if (lastRosterSuccess) {
      const rosterAge = calculatedAt.getTime() - (lastRosterSuccess.finishedAt ?? lastRosterSuccess.startedAt).getTime();
      if (rosterAge > 6 * 60 * 60_000) rosterCoverageStatus = "STALE";
      else if (unavailable > 0 && rosterObserved === 0) rosterCoverageStatus = "PLANTILLA_NO_DISPONIBLE";
      else if (unavailable > 0 || ambiguous > 0) rosterCoverageStatus = "PARTIAL";
      else rosterCoverageStatus = "COMPLETE";
    }
    let coverageStatus: TeamIndexCoverageStatus;
    if (!item.competitionSeasonId || (!latestTeamRun && seasonRows.length === 0)) coverageStatus = "NOT_SYNCED";
    else if (latestTeamRun && failed(latestTeamRun.status)) coverageStatus = "FAILED";
    else if (item.status === "PARTIAL") coverageStatus = "PARTIAL";
    else if (!lastTeamSuccess) coverageStatus = "NOT_SYNCED";
    else if (calculatedAt.getTime() - (lastTeamSuccess.finishedAt ?? lastTeamSuccess.startedAt).getTime() > STALE_AFTER_MS) coverageStatus = "STALE";
    else coverageStatus = "COMPLETE";
    const hasValidSnapshot = Boolean(lastTeamSuccess);
    const canAssertCounts = coverageStatus === "COMPLETE" || coverageStatus === "PARTIAL" || coverageStatus === "STALE" || hasValidSnapshot;
    return {
      catalogId: item.id,
      competitionSeasonId: item.competitionSeasonId,
      coverageStatus,
      calculatedAt: calculatedAt.toISOString(),
      teamsLastSyncedAt: iso(lastTeamSuccess?.finishedAt ?? lastTeamSuccess?.startedAt),
      playersLastSyncedAt: iso(lastPlayerSuccess?.finishedAt ?? lastPlayerSuccess?.startedAt),
      rosterCoverageStatus,
      rosterLastSyncedAt: iso(lastRosterSuccess?.finishedAt ?? lastRosterSuccess?.startedAt),
      rosterRegistrationCount: lastRosterSuccess ? seasonRows.reduce((sum, team) => sum + Number(rows.find(row => row.catalogId === item.id && row.teamId === team.teamId)?.rosterRegistrationCount ?? 0), 0) : null,
      tentativeRegistrationCount: lastRosterSuccess ? seasonRows.reduce((sum, team) => sum + Number(rows.find(row => row.catalogId === item.id && row.teamId === team.teamId)?.tentativeRegistrationCount ?? 0), 0) : null,
      ambiguousCount: ambiguous,
      teamCount: canAssertCounts ? seasonRows.length : null,
      playerRegistrationCount: canAssertCounts ? seasonRows.reduce((sum, team) => sum + team.playerRegistrationCount, 0) : null,
      teams: canAssertCounts ? seasonRows : [],
    };
  });
}

/** Read-only, bounded aggregation: one query for rows and one for coverage runs, never one per team. */
export async function getMonitoredCompetitionTeamIndexes(): Promise<CompetitionTeamIndex[]> {
  if (process.env.INGESTION_TEAM_INDEX_ENABLED === "false") return [];
  const catalog = await db.fabCompetitionCatalog.findMany({
    where: { monitored: true }, orderBy: { id: "asc" }, select: { id: true, categoryCompetitionId: true, competitionSeasonId: true, status: true, competitionSeason: { select: { fantasyEnabled: true } } },
  });
  const seasonIds = catalog.flatMap(item => item.competitionSeasonId ? [item.competitionSeasonId] : []);
  if (!seasonIds.length) return buildCompetitionTeamIndexes(catalog, [], [], new Date());
  const seasonIdSql = Prisma.join(seasonIds.map(id => Prisma.sql`${id}::uuid`));
  const [rows, runs, jobs] = await Promise.all([
    db.$queryRaw<TeamIndexRow[]>(Prisma.sql`
      SELECT c.id AS "catalogId", c.competition_season_id AS "competitionSeasonId",
             t.id AS "teamId", COALESCE(tr.display_name, t.name) AS "teamName",
             COUNT(pr.id)::bigint AS "playerRegistrationCount",
             COUNT(pr.id) FILTER (WHERE pr.roster_seen_at IS NOT NULL)::bigint AS "rosterRegistrationCount",
             COUNT(pr.id) FILTER (WHERE pr.identity_status = 'TENTATIVE')::bigint AS "tentativeRegistrationCount"
      FROM fab_competition_catalog c
      LEFT JOIN team_registrations tr ON tr.competition_season_id = c.competition_season_id
      LEFT JOIN teams t ON t.id = tr.team_id
      LEFT JOIN player_registrations pr ON pr.team_registration_id = tr.id
        AND pr.competition_season_id = c.competition_season_id
      WHERE c.monitored = TRUE AND c.competition_season_id IN (${seasonIdSql})
      GROUP BY c.id, c.competition_season_id, t.id, tr.display_name, t.name
      ORDER BY lower(COALESCE(tr.display_name, t.name)) ASC NULLS LAST, t.id ASC
    `),
    db.ingestionRun.findMany({
      where: { competitionSeasonId: { in: seasonIds }, jobName: { in: ["competition", "roster", "stats"] } },
      orderBy: { startedAt: "desc" },
      select: { competitionSeasonId: true, jobName: true, status: true, startedAt: true, finishedAt: true, counters: true },
    }),
    db.ingestionJob.findMany({
      where: { type: "COMPETITION", targetKey: { in: catalog.map(item => `categoryId:${item.categoryCompetitionId}`) }, status: { in: ["SUCCEEDED", "FAILED"] } },
      orderBy: { requestedAt: "desc" },
      select: { targetKey: true, status: true, requestedAt: true, startedAt: true, finishedAt: true, counters: true },
    }),
  ]);
  const seasonByTarget = new Map(catalog.map(item => [`categoryId:${item.categoryCompetitionId}`, { id: item.competitionSeasonId, rosterEnabled: Boolean(item.competitionSeason?.fantasyEnabled) }]));
  const manualRuns: CoverageRun[] = jobs.flatMap(job => {
    const selected = seasonByTarget.get(job.targetKey);
    const competitionSeasonId = selected?.id;
    if (!competitionSeasonId) return [];
    const startedAt = job.startedAt ?? job.requestedAt;
    const rosterReported = job.counters && typeof job.counters === "object" && "rosterTeams" in job.counters;
    const rosterFailed = job.status === "FAILED" && selected?.rosterEnabled;
    return ["competition", "stats", ...(rosterReported || rosterFailed ? ["roster"] : [])].map(jobName => ({
      competitionSeasonId, jobName, status: job.status,
      startedAt, finishedAt: job.finishedAt, counters: job.counters,
    }));
  });
  return buildCompetitionTeamIndexes(catalog, rows, [...runs, ...manualRuns], new Date());
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

export async function getIngestionDashboard(actorProfileId: string, filters: { status?: string; type?: string; competitionSeasonId?: string; catalogQuery?: string; catalogStatus?: string; delegation?: string; season?: string } = {}) {
  const statuses = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"];
  const jobWhere = { ...(statuses.includes(filters.status ?? "") ? { status: filters.status } : {}), ...(JOB_TYPES.includes(filters.type as typeof JOB_TYPES[number]) ? { type: filters.type } : {}) };
  const competitionSeasonId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(filters.competitionSeasonId ?? "") ? filters.competitionSeasonId : undefined;
  const catalogQuery = filters.catalogQuery?.trim().slice(0, 100);
  const catalogAnd = [
    ...(catalogQuery ? [{ OR: ["competitionName", "categoryName", "delegationName", "categoryCompetitionId"].map(field => ({ [field]: { contains: catalogQuery, mode: "insensitive" as const } })) }] : []),
    ...(filters.season ? [{ OR: [{ seasonName: filters.season }, { competitionSeason: { season: { name: filters.season } } }] }] : []),
  ];
  const catalogWhere = {
    ...(catalogAnd.length ? { AND: catalogAnd } : {}),
    ...(filters.catalogStatus ? { status: filters.catalogStatus } : {}),
    ...(filters.delegation ? { delegationName: filters.delegation } : {}),
  };
  const [jobs, runs, heartbeat, lastSuccess, catalog, catalogScan, delegations, seasons, teamIndexes] = await Promise.all([
    db.ingestionJob.findMany({ where: jobWhere, orderBy: { requestedAt: "desc" }, take: 50, include: { requestedBy: { select: { username: true, displayName: true } } } }),
    db.ingestionRun.findMany({ where: competitionSeasonId ? { competitionSeasonId } : {}, orderBy: { startedAt: "desc" }, take: 50, include: { competitionSeason: { select: { id: true, name: true, competition: { select: { name: true } } } } } }),
    db.ingestionHeartbeat.findFirst({ orderBy: { seenAt: "desc" } }),
    db.ingestionRun.findFirst({ where: { status: "SUCCEEDED" }, orderBy: { finishedAt: "desc" } }),
    db.fabCompetitionCatalog.findMany({ where: catalogWhere, orderBy: RECENT_CATALOG_ORDER, take: 200,
      include: { competitionSeason: { include: { competition: true, season: true, _count: { select: { fantasyLeagues: { where: { status: "ACTIVE" } } } }, games: { where: { syncStatus: "active" }, select: { status: true, statsSyncStatus: true, scheduledAt: true, roundNumber: true } } } } } }),
    db.fabCompetitionCatalogScan.findFirst({ orderBy: { startedAt: "desc" } }),
    db.fabCompetitionCatalog.findMany({ distinct: ["delegationName"], orderBy: { delegationName: "asc" }, select: { delegationName: true } }),
    db.season.findMany({ orderBy: { name: "desc" }, select: { name: true } }),
    getMonitoredCompetitionTeamIndexes(),
  ]);
  const now = Date.now(), age = heartbeat ? now - heartbeat.seenAt.getTime() : Infinity;
  const health = age <= 5 * 60_000 ? "HEALTHY" : age <= 20 * 60_000 ? "DEGRADED" : "STALE";
  const visibleJobs = jobs.map(job => ({ ...job, effectiveStatus: job.status === "RUNNING" && (!job.heartbeatAt || now - job.heartbeatAt.getTime() > 20 * 60_000) ? "STALE" : job.status }));
  return { actorProfileId, health, heartbeat, lastSuccess, jobs: visibleJobs, runs: runs.map(run => ({ ...run, errorCategory: classifyIngestionError(run.errorCode) })), catalog, teamIndexes, catalogScan, delegations: delegations.map(item => item.delegationName), seasons: seasons.map(item => item.name) };
}

export async function setCompetitionMonitoring(actorProfileId: string, catalogId: string, monitored: boolean) {
  const parsed = parseMonitoringUpdate(catalogId, monitored);
  const entry = await db.fabCompetitionCatalog.findUnique({ where: { id: catalogId }, select: { id: true } });
  if (!entry) throw new AdminError("CATALOG_ENTRY_NOT_FOUND", 404);
  return db.$transaction(async tx => {
    const updated = await tx.fabCompetitionCatalog.update({ where: { id: catalogId }, data: { monitored: parsed.monitored } });
    await tx.adminAuditEvent.create({ data: { actorProfileId, action: parsed.monitored ? "COMPETITION_MONITOR_ENABLE" : "COMPETITION_MONITOR_DISABLE", resourceType: "FAB_COMPETITION", resourceId: catalogId, result: "SUCCESS" } });
    return updated;
  });
}

export async function enableCompetitionFantasy(actorProfileId: string, catalogId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(catalogId)) throw new AdminError("INVALID_TARGET");
  const entry = await db.fabCompetitionCatalog.findUnique({
    where: { id: catalogId },
    select: { id: true, categoryCompetitionId: true, competitionSeasonId: true, monitored: true },
  });
  if (!entry?.monitored) throw new AdminError("MONITORED_COMPETITION_REQUIRED", 404);
  if (!entry.competitionSeasonId) throw new AdminError("SYNC_COMPETITION_FIRST", 409);
  const result = await db.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM competition_seasons WHERE id=${entry.competitionSeasonId}::uuid FOR UPDATE`);
    const current = await tx.competitionSeason.findUniqueOrThrow({
      where: { id: entry.competitionSeasonId! }, select: { fantasyEnabled: true, fantasyRole: true },
    });
    if (!current.fantasyEnabled) {
      const primary = await tx.competitionSeason.findFirst({
        where: { fantasyRole: "primary", fantasyEnabled: true }, select: { id: true },
      });
      await tx.competitionSeason.update({
        where: { id: entry.competitionSeasonId! },
        data: { fantasyEnabled: true, fantasyRole: primary ? "validation" : "primary" },
      });
    }
    await tx.adminAuditEvent.create({
      data: { actorProfileId, action: "COMPETITION_FANTASY_ENABLE", resourceType: "FAB_COMPETITION",
        resourceId: catalogId, result: current.fantasyEnabled ? "DUPLICATE" : "SUCCESS" },
    });
    return { alreadyEnabled: current.fantasyEnabled };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const queued = await enqueueIngestionJob(actorProfileId, {
    type: "COMPETITION", target: { categoryId: entry.categoryCompetitionId },
    reason: "Preparar plantillas fantasy",
  });
  return { ...result, jobId: queued.job.id, duplicateJob: queued.duplicate };
}

/** Stage one of suspension: atomically revoke Fantasy eligibility without deleting sports data. */
export async function disableCompetitionFantasy(actorProfileId: string, catalogId: string, confirmation: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(catalogId)) throw new AdminError("INVALID_TARGET");
  const entry = await db.fabCompetitionCatalog.findUnique({
    where: { id: catalogId },
    select: { id: true, categoryCompetitionId: true, competitionSeasonId: true, monitored: true },
  });
  if (!entry?.monitored) throw new AdminError("MONITORED_COMPETITION_REQUIRED", 404);
  if (confirmation !== entry.categoryCompetitionId) throw new AdminError("CONFIRMATION_REQUIRED", 422);
  if (!entry.competitionSeasonId) throw new AdminError("SYNC_COMPETITION_FIRST", 409);
  return db.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM competition_seasons WHERE id=${entry.competitionSeasonId}::uuid FOR UPDATE`);
    const current = await tx.competitionSeason.findUniqueOrThrow({
      where: { id: entry.competitionSeasonId! }, select: { fantasyEnabled: true, fantasyRole: true },
    });
    if (current.fantasyEnabled) {
      await tx.competitionSeason.update({
        where: { id: entry.competitionSeasonId! },
        data: { fantasyEnabled: false, fantasyRole: "disabled" },
      });
      if (current.fantasyRole === "primary") {
        const replacement = await tx.competitionSeason.findFirst({
          where: { fantasyEnabled: true, id: { not: entry.competitionSeasonId! } },
          orderBy: { id: "asc" }, select: { id: true },
        });
        if (replacement) await tx.competitionSeason.update({ where: { id: replacement.id }, data: { fantasyRole: "primary" } });
      }
    }
    await tx.adminAuditEvent.create({ data: {
      actorProfileId, action: "COMPETITION_FANTASY_DISABLE", resourceType: "FAB_COMPETITION",
      resourceId: catalogId, result: current.fantasyEnabled ? "SUCCESS" : "DUPLICATE",
    } });
    return { alreadyDisabled: !current.fantasyEnabled };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function parseMonitoringUpdate(catalogId: string, monitored: unknown) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(catalogId) || typeof monitored !== "boolean") throw new AdminError("INVALID_TARGET");
  return { catalogId, monitored };
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
