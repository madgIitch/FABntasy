#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const kind = process.argv[2];
const supported = new Set(["small-smoke", "idempotency", "assertions", "realistic-cycle", "teardown-isolation"]);
if (!supported.has(kind)) {
  process.stderr.write(`gate 14F desconocido: ${kind ?? "(vacío)"}\n`);
  process.exit(1);
}

if (!process.env.TEST_DATABASE_URL || process.env.CANASTIO_TEST_DATABASE !== "1") {
  if (process.env.CANASTIO_REQUIRE_TEST_DB === "1") {
    process.stderr.write(`${kind}: TEST_DATABASE_URL y CANASTIO_TEST_DATABASE=1 son obligatorios en integración\n`);
    process.exit(1);
  }
  process.stdout.write(`${kind}: SKIP (sin base de integración; fija CANASTIO_REQUIRE_TEST_DB=1 en CI)\n`);
  process.exit(0);
}

const suffix = `${Date.now().toString(36)}_${process.pid}`.toLowerCase();
const runId = `gate_${kind.replaceAll("-", "_")}_${suffix}`.slice(0, 64);
const cases = {
  "small-smoke": { scenario: "market.operations", profile: "small", repeats: 1 },
  "idempotency": { scenario: "market.partial-roster", profile: "small", repeats: 2 },
  "assertions": { scenario: "lineup.locked", profile: "small", repeats: 1 },
  "realistic-cycle": { scenario: "league.realistic-20", profile: "realistic", repeats: 1 },
  "teardown-isolation": { scenario: "market.partial-roster", profile: "small", repeats: 1 }
};
const selected = cases[kind];

function invoke(command, selectedRunId = runId) {
  const args = ["scripts/test-data.mjs", command, "--scenario", selected.scenario, "--profile", selected.profile, "--seed", "1406", "--clock", "2026-10-02T18:00:00+02:00", "--run-id", selectedRunId];
  const result = spawnSync(process.execPath, args, { encoding: "utf8", stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  if (kind === "teardown-isolation") {
    const sentinelRun = `${runId}_sentinel`.slice(0,64);
    invoke("run");
    invoke("run",sentinelRun);
    invoke("teardown");
    invoke("assert",sentinelRun);
    invoke("teardown",sentinelRun);
  } else {
    for (let i = 0; i < selected.repeats; i += 1) invoke("run");
    invoke("assert");
  }
} finally {
  if (kind !== "teardown-isolation") invoke("teardown");
}
