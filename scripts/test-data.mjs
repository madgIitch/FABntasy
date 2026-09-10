#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertClock,
  assertSafeRunId,
  assertTestDatabase,
  loadManifest,
  parseArgs,
  renderSql,
  sqlLiteral,
  validateManifest
} from "./test-data-lib.mjs";

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  process.stderr.write(`test-data: ${message}\n`);
  process.exitCode = 1;
}

function printHelp() {
  process.stdout.write(`Canastio test-data\n\n` +
    `  list\n` +
    `  validate\n` +
    `  preflight --scenario <id> --profile <name> --seed <int> --clock <iso> [--run-id <id>]\n` +
    `  bootstrap --scenario <id> --profile <name> --seed <int> --clock <iso> --run-id <id>\n` +
    `  foundation --scenario <id> --profile <name> --seed <int> --clock <iso> --run-id <id>\n` +
    `  run --scenario <id> --profile <name> --seed <int> --clock <iso> --run-id <id> [--identity-map <json>]\n` +
    `  cycle --profile <name> --seed <int> --clock <iso> --run-id <id> [--identity-map <json>]\n` +
    `  assert --scenario <id> --profile <name> --seed <int> --clock <iso> --run-id <id>\n` +
    `  teardown --scenario <id> --profile <name> --seed <int> --clock <iso> --run-id <id>\n\n` +
    `Los comandos que muten datos exigirán CANASTIO_TEST_DATABASE=1 y TEST_DATABASE_URL.\n`);
}

function context(manifest, options) {
  const scenario = manifest.scenarios.find((item) => item.id === options.scenario);
  if (!scenario) throw new Error(`scenario desconocido: ${options.scenario ?? "(vacío)"}`);
  const profile = options.profile;
  const dimensions = manifest.profiles[profile];
  if (!dimensions) throw new Error(`profile desconocido: ${profile ?? "(vacío)"}`);
  if (scenario.profiles && !scenario.profiles.includes(profile)) throw new Error(`${scenario.id} no admite el perfil ${profile}`);
  const seed = Number(options.seed);
  if (!Number.isSafeInteger(seed)) throw new Error("seed debe ser un entero seguro");
  const clock = assertClock(options.clock);
  const runId = assertSafeRunId(options["run-id"] ?? `run_${randomUUID().replaceAll("-", "").slice(0, 16)}`);
  const databaseUrl = assertTestDatabase();
  const identityPath = options["identity-map"] ? resolve(root, options["identity-map"]) : null;
  let identities = [];
  if (identityPath) {
    if (!existsSync(identityPath)) throw new Error(`identity-map no existe: ${identityPath}`);
    const parsed = JSON.parse(readFileSync(identityPath, "utf8"));
    identities = parsed.users ?? parsed;
    if (!Array.isArray(identities) || identities.length < dimensions.managers + 1) throw new Error(`identity-map necesita al menos ${dimensions.managers + 1} usuarios`);
    for (const identity of identities.slice(0, dimensions.managers + 1)) {
      if (!/^\d{2,3}$/.test(identity.slot ?? "") || !/^[0-9a-f-]{36}$/i.test(identity.authUserId ?? "") || !/^[a-z0-9_]{3,24}$/.test(identity.username ?? "")) throw new Error("identity-map contiene una identidad inválida");
    }
  }
  return { scenario, profile, dimensions, seed, clock, runId, databaseUrl, identities };
}

function executeSql(relativePath, ctx) {
  const template = readFileSync(resolve(root, relativePath), "utf8");
  const playersPerTeam = Math.ceil(ctx.dimensions.players / ctx.dimensions.realTeams);
  const sql = renderSql(template, {
    run_id: sqlLiteral(ctx.runId),
    scenario: sqlLiteral(ctx.scenario.id),
    seed: ctx.seed,
    clock: `${sqlLiteral(ctx.clock)}::timestamptz`,
    real_teams: ctx.dimensions.realTeams,
    players_per_team: playersPerTeam,
    managers: ctx.dimensions.managers,
    rounds: ctx.dimensions.rounds,
    identity_map: sqlLiteral(JSON.stringify(ctx.identities)),
    external_identities: ctx.identities.length ? "true" : "false"
  });
  const dir = mkdtempSync(join(tmpdir(), "canastio-14f-"));
  const file = join(dir, "run.sql");
  try {
    writeFileSync(file, sql, { encoding: "utf8", flag: "wx" });
    const executable = process.platform === "win32" ? process.execPath : "corepack";
    const prefix = process.platform === "win32" ? [join(dirname(process.execPath), "node_modules/corepack/dist/corepack.js")] : [];
    const result = spawnSync(executable, [...prefix, "pnpm", "exec", "prisma", "db", "execute", "--file", file, "--schema", "prisma/schema.prisma"], {
      cwd: root,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, DATABASE_URL: ctx.databaseUrl, DIRECT_URL: ctx.databaseUrl },
      stdio: ["ignore", "pipe", "pipe"]
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${relativePath} falló:\n${result.stderr || result.stdout}`);
    process.stdout.write(`${relativePath}: OK\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();
  const errors = validateManifest(manifest);

  if (command === "help") printHelp();
  else if (command === "validate") {
    if (errors.length) throw new Error(errors.join("; "));
    process.stdout.write(`OK ${manifest.schemaVersion}: ${manifest.scenarios.length} escenarios, ${Object.keys(manifest.profiles).length} perfiles\n`);
  } else if (command === "list") {
    if (errors.length) throw new Error(errors.join("; "));
    for (const scenario of manifest.scenarios) process.stdout.write(`${scenario.id}\t${scenario.checkpoint}\t${scenario.tags.join(",")}\n`);
  } else if (["preflight", "bootstrap", "foundation", "run", "cycle", "assert", "teardown"].includes(command)) {
    if (errors.length) throw new Error(errors.join("; "));
    if (command === "cycle" && !options.scenario) options.scenario = "onboarding.no-league";
    const ctx = context(manifest, options);
    const { scenario, profile, seed, clock, runId, databaseUrl, identities } = ctx;
    const target = new URL(databaseUrl);
    const runManifest = {
      schemaVersion: "canastio-test-run.v1",
      scenario: scenario.id,
      checkpoint: scenario.checkpoint,
      runId,
      seed,
      clock,
      profile,
      target: `${target.hostname}/${decodeURIComponent(target.pathname.slice(1))}`,
      keepOnFail: options["keep-on-fail"] === "true",
      identityMode: identities.length ? "supabase" : "generated"
    };
    process.stdout.write(JSON.stringify(runManifest, null, 2) + "\n");
    if (command === "bootstrap") executeSql("seeding/bootstrap/supabase.sql", ctx);
    if (command === "foundation") {
      executeSql("seeding/foundation/sports.sql", ctx);
      executeSql("seeding/foundation/fantasy.sql", ctx);
    }
    if (command === "run") {
      executeSql("seeding/foundation/sports.sql", ctx);
      executeSql("seeding/foundation/fantasy.sql", ctx);
      executeSql("seeding/scenarios/apply.sql", ctx);
      executeSql("seeding/assertions/sports.sql", ctx);
      executeSql("seeding/assertions/economy.sql", ctx);
      executeSql("seeding/assertions/domain.sql", ctx);
    }
    if (command === "cycle") {
      executeSql("seeding/foundation/sports.sql", ctx);
      executeSql("seeding/foundation/fantasy.sql", ctx);
      const cycle = ["market.empty-roster", "market.operations", "lineup.draft", "lineup.locked", "round.live", "round.finished", "round.published", "pricing.history", "league.activity", "round.corrected"];
      for (const id of cycle) {
        const stage = manifest.scenarios.find((item) => item.id === id) ?? (id === "round.finished" ? { id, checkpoint: "T8", tags: ["round", "scoring"] } : null);
        if (!stage) throw new Error(`checkpoint sin escenario: ${id}`);
        const stageContext = { ...ctx, scenario: stage };
        process.stdout.write(`${stage.checkpoint} ${stage.id}\n`);
        executeSql("seeding/scenarios/apply.sql", stageContext);
        executeSql("seeding/assertions/sports.sql", stageContext);
        executeSql("seeding/assertions/economy.sql", stageContext);
        executeSql("seeding/assertions/domain.sql", stageContext);
      }
    }
    if (command === "assert") {
      executeSql("seeding/assertions/sports.sql", ctx);
      executeSql("seeding/assertions/economy.sql", ctx);
      executeSql("seeding/assertions/domain.sql", ctx);
    }
    if (command === "teardown") {
      executeSql("seeding/teardown/fantasy.sql", ctx);
      executeSql("seeding/teardown/run.sql", ctx);
    }
  } else throw new Error(`comando desconocido: ${command}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
