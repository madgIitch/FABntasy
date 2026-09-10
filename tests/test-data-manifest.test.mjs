import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireRunLock,
  assertClock,
  assertSafeRunId,
  assertTestDatabase,
  loadManifest,
  renderSql,
  sqlLiteral,
  validateManifest
} from "../scripts/test-data-lib.mjs";

test("el lock impide dos runners simultáneos con el mismo run-id", () => {
  const directory = mkdtempSync(join(tmpdir(), "canastio-lock-test-"));
  try {
    const release = acquireRunLock("run_lock_test", directory);
    assert.throws(() => acquireRunLock("run_lock_test", directory), /ya está siendo ejecutado/);
    release();
    const releaseAgain = acquireRunLock("run_lock_test", directory);
    releaseAgain();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("el catálogo 14F contiene 15 escenarios válidos", () => {
  const manifest = loadManifest();
  assert.deepEqual(validateManifest(manifest), []);
  assert.equal(manifest.scenarios.length, 15);
  assert.equal(manifest.transitions.length, 12);
  assert.equal(manifest.expectedRejections.length, 10);
  assert.equal(manifest.concurrencyRaces.length, 6);
});

test("el render SQL exige todos los parámetros y escapa literales", () => {
  assert.equal(sqlLiteral("run_o'hara"), "'run_o''hara'");
  assert.equal(renderSql("select {{value}}", { value: 7 }), "select 7");
  assert.throws(() => renderSql("select {{missing}}", {}));
});

test("todos los scripts SQL 14F renderizan sin placeholders", () => {
  const files = [
    "seeding/bootstrap/supabase.sql",
    "seeding/foundation/sports.sql",
    "seeding/foundation/fantasy.sql",
    "seeding/scenarios/apply.sql",
    "seeding/assertions/sports.sql",
    "seeding/assertions/economy.sql",
    "seeding/assertions/domain.sql",
    "seeding/teardown/fantasy.sql",
    "seeding/teardown/run.sql"
  ];
  const values = {
    run_id: "'run_1406_small'",
    scenario: "'market.operations'",
    seed: 1406,
    clock: "'2026-10-02T18:00:00+02:00'::timestamptz",
    real_teams: 4,
    players_per_team: 10,
    managers: 3,
    rounds: 2,
    identity_map: "'[]'",
    external_identities: "false"
  };
  for (const file of files) {
    const template = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const rendered = renderSql(template, values);
    assert.doesNotMatch(rendered, /\{\{/);
    if (template.includes("{{run_id}}")) assert.match(rendered, /run_1406_small/);
  }
});

test("run id y clock son explícitos y restringidos", () => {
  assert.equal(assertSafeRunId("run_1406_small"), "run_1406_small");
  assert.throws(() => assertSafeRunId("prod"));
  assert.equal(assertClock("2026-10-02T18:00:00+02:00"), "2026-10-02T18:00:00+02:00");
  assert.throws(() => assertClock("2026-10-02 18:00"));
});

test("la base nunca se infiere de DATABASE_URL", () => {
  assert.throws(() => assertTestDatabase({ DATABASE_URL: "postgres://x:y@prod/main" }));
  assert.throws(() => assertTestDatabase({ CANASTIO_TEST_DATABASE: "1", TEST_DATABASE_URL: "postgres://x:y@prod/main" }));
  assert.equal(
    assertTestDatabase({ CANASTIO_TEST_DATABASE: "1", TEST_DATABASE_URL: "postgres://x:y@localhost/canastio_test" }),
    "postgres://x:y@localhost/canastio_test"
  );
  assert.equal(
    assertTestDatabase({ CANASTIO_TEST_DATABASE: "1", CANASTIO_TEST_PROJECT_REF: "abcdefghijklmnopqrst", TEST_DATABASE_URL: "postgres://postgres.abcdefghijklmnopqrst:x@aws.pooler.supabase.com/postgres" }),
    "postgres://postgres.abcdefghijklmnopqrst:x@aws.pooler.supabase.com/postgres"
  );
});
