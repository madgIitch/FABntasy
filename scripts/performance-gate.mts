import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertTestDatabase } from "./test-data-lib.mjs";

const databaseUrl = assertTestDatabase();
process.env.DATABASE_URL = databaseUrl;
const [{ db }, { getHomeDashboard }, { getMarketContext }, { getRanking, recomputeRoundRankings }, { clearPerformanceCache }] = await Promise.all([
  import("../apps/web/src/server/db"),
  import("../apps/web/src/server/home-dashboard"),
  import("../apps/web/src/server/fantasy-market"),
  import("../apps/web/src/server/round-rankings"),
  import("../apps/web/src/server/performance"),
]);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const concurrency = 20;
const samples = Number(process.env.CANASTIO_PERF_SAMPLES ?? 40);
const percentile = (values: number[], p: number) => values.slice().sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)] ?? 0;
type Result = { name: string; samples: number; concurrency: number; p50Ms: number; p95Ms: number; errors: number; errorTypes: string[] };

const league = await db.league.findFirst({ where: { name: { startsWith: "Liga Sintética perf-realistic" } }, include: { ownerProfile: true }, orderBy: { createdAt: "desc" } });
if (!league) throw new Error("fixture realistic perf-realistic no encontrado; ejecuta test-data cycle primero");
const round = await db.game.findFirst({ where: { competitionSeasonId: league.competitionSeasonId }, orderBy: { roundNumber: "asc" }, select: { roundNumber: true } });
if (!round?.roundNumber) throw new Error("fixture realistic sin jornada");
const actor = league.ownerProfile.authUserId;
const workloads = {
  home: () => getHomeDashboard(actor, league.id),
  market: () => getMarketContext({ authUserId: actor }, league.id),
  ranking: () => getRanking(actor, { competitionSeasonId: league.competitionSeasonId, leagueId: league.id, roundNumber: round.roundNumber! }),
};

async function measure(name: string, work: () => Promise<unknown>, cold: boolean): Promise<Result> {
  const durations: number[] = [], errors: string[] = [];
  for (let offset = 0; offset < samples; offset += concurrency) {
    if (cold) clearPerformanceCache();
    await Promise.all(Array.from({ length: Math.min(concurrency, samples - offset) }, async () => {
      const start = performance.now();
      try { await work(); durations.push(performance.now() - start); }
      catch (error) { errors.push(error instanceof Error ? error.name : "UnknownError"); }
    }));
  }
  return { name, samples, concurrency, p50Ms: percentile(durations, .5), p95Ms: percentile(durations, .95), errors: errors.length, errorTypes: [...new Set(errors)] };
}

try {
  const queryInventory = {
    home: `SELECT * FROM "fantasy_round_scores" WHERE "league_id" = '${league.id}' AND "superseded_at" IS NULL ORDER BY "round_number" DESC LIMIT 20`,
    market: `SELECT * FROM "fantasy_roster_slots" WHERE "league_id" = '${league.id}'`,
    ranking: `SELECT * FROM "fantasy_team_totals" WHERE "league_id" = '${league.id}' ORDER BY "league_position" ASC`,
    publication: `SELECT "fantasy_team_id", sum("points") FROM "fantasy_round_scores" WHERE "competition_season_id" = '${league.competitionSeasonId}' AND "status" = 'PUBLISHED' AND "superseded_at" IS NULL GROUP BY "fantasy_team_id"`,
  };
  const explainPlans: Record<string, unknown> = {};
  for (const [name, sql] of Object.entries(queryInventory)) explainPlans[name] = await db.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
  const cold: Result[] = [];
  for (const [name, work] of Object.entries(workloads)) cold.push(await measure(name, work, true));
  clearPerformanceCache();
  await Promise.all(Object.values(workloads).map((work) => work()));
  const warm = await Promise.all(Object.entries(workloads).map(([name, work]) => measure(name, work, false)));
  const publicationStart = performance.now();
  const [publication, ...interactive] = await Promise.all([
    recomputeRoundRankings(league.competitionSeasonId, round.roundNumber),
    ...Object.entries(workloads).map(([name, work]) => measure(name, work, false)),
  ]);
  const publicationMs = performance.now() - publicationStart;
  const limits: Record<string, number> = { home: 800, market: 1000, ranking: 1000 };
  for (const row of cold) if (row.p95Ms > 1500 || row.errors > 0) throw new Error(`cold ${row.name} excede el presupuesto`);
  for (const row of warm) if (row.p95Ms > limits[row.name] || row.errors > 0) throw new Error(`warm ${row.name} excede el presupuesto`);
  if (publicationMs > 30_000 || interactive.some((row) => row.p95Ms > 1500 || row.errors > 0)) throw new Error("publicación concurrente excede el presupuesto");
  const report = { schemaVersion: "canastio-performance-report.v1", recordedAt: new Date().toISOString(), environment: { node: process.version, platform: process.platform, ci: Boolean(process.env.CI), database: "integration-marked" }, dataset: { profile: "realistic", realTeams: 12, players: 144, managers: 20 }, concurrency, samples, cold, warm, publication: { durationMs: publicationMs, result: publication, interactive }, explainPlans };
  const output = resolve(root, process.env.CANASTIO_PERF_REPORT ?? "progress/performance-report.json");
  mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2) + "\n"); console.log(JSON.stringify(report));
} finally { await db.$disconnect(); }
