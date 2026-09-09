import test from "node:test";
import assert from "node:assert/strict";
import {
  assertClock,
  assertSafeRunId,
  assertTestDatabase,
  loadManifest,
  validateManifest
} from "../scripts/test-data-lib.mjs";

test("el catálogo 14F contiene 15 escenarios válidos", () => {
  const manifest = loadManifest();
  assert.deepEqual(validateManifest(manifest), []);
  assert.equal(manifest.scenarios.length, 15);
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
});
