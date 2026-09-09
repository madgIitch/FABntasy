#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import {
  assertClock,
  assertSafeRunId,
  assertTestDatabase,
  loadManifest,
  parseArgs,
  validateManifest
} from "./test-data-lib.mjs";

function fail(message) {
  process.stderr.write(`test-data: ${message}\n`);
  process.exitCode = 1;
}

function printHelp() {
  process.stdout.write(`Canastio test-data\n\n` +
    `  list\n` +
    `  validate\n` +
    `  preflight --scenario <id> --profile <name> --seed <int> --clock <iso> [--run-id <id>]\n\n` +
    `Los comandos que muten datos exigirán CANASTIO_TEST_DATABASE=1 y TEST_DATABASE_URL.\n`);
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
  } else if (command === "preflight") {
    if (errors.length) throw new Error(errors.join("; "));
    const scenario = manifest.scenarios.find((item) => item.id === options.scenario);
    if (!scenario) throw new Error(`scenario desconocido: ${options.scenario ?? "(vacío)"}`);
    const profile = options.profile;
    if (!manifest.profiles[profile]) throw new Error(`profile desconocido: ${profile ?? "(vacío)"}`);
    if (scenario.profiles && !scenario.profiles.includes(profile)) throw new Error(`${scenario.id} no admite el perfil ${profile}`);
    const seed = Number(options.seed);
    if (!Number.isSafeInteger(seed)) throw new Error("seed debe ser un entero seguro");
    const clock = assertClock(options.clock);
    const runId = assertSafeRunId(options["run-id"] ?? `run_${randomUUID().replaceAll("-", "").slice(0, 16)}`);
    const databaseUrl = assertTestDatabase();
    const target = new URL(databaseUrl);
    process.stdout.write(JSON.stringify({
      schemaVersion: "canastio-test-run.v1",
      scenario: scenario.id,
      checkpoint: scenario.checkpoint,
      runId,
      seed,
      clock,
      profile,
      target: `${target.hostname}/${decodeURIComponent(target.pathname.slice(1))}`,
      keepOnFail: options["keep-on-fail"] === "true"
    }, null, 2) + "\n");
  } else throw new Error(`comando desconocido: ${command}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
