import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDefect,
  evidenceFingerprint,
  findSensitivePaths,
  validateReleaseCandidateManifest,
  validateRiskAcceptance,
} from "./manifest.mjs";

const digest = `sha256:${"a".repeat(64)}`;
const valid = () => ({
  schemaVersion: "fabntasy-rc.v1",
  competition: { name: "1ª Provincial Senior Masculina de Sevilla", season: "2026/2027", fabCompetitionId: "fab-comp", fabCategoryCompetitionId: "fab-category" },
  round: { fabRoundId: "fab-round", number: 1 },
  window: { timezone: "Europe/Madrid", startsAt: "2026-10-02T18:00:00+02:00", endsAt: "2026-10-04T22:00:00+02:00" },
  ruleSet: { id: "ruleset-id", version: "v1" },
  testLeagueIds: ["league-id"],
  release: { commit: "abcdef0", webDigest: digest, ingestorDigest: digest },
  rollbackBaseline: { release: "0.9.8", commit: "1234567", webDigest: digest, ingestorDigest: digest },
  responsible: { release: "release-owner", operations: "operations-owner" },
});

test("accepts a complete sanitized RC manifest", () => assert.deepEqual(validateReleaseCandidateManifest(valid()), []));

test("rejects identity inferred without FAB IDs and an incomplete rollback baseline", () => {
  const manifest = valid();
  delete manifest.competition.fabCompetitionId;
  delete manifest.rollbackBaseline.webDigest;
  assert.deepEqual(validateReleaseCandidateManifest(manifest), ["competition FAB IDs are required", "rollback baseline release, commit and digests are required"]);
});

test("rejects secrets and PII recursively", () => {
  const manifest = valid();
  manifest.evidence = { nested: [{ Authorization: "Bearer secret" }], userEmail: "real@example.com" };
  assert.deepEqual(findSensitivePaths(manifest.evidence), ["$.nested[0].Authorization", "$.userEmail"]);
  assert.match(validateReleaseCandidateManifest(manifest).at(-1), /sensitive/);
});

test("implements the approved defect severity taxonomy", () => {
  assert.equal(classifyDefect({ blocksCriticalFlow: true }), "BLOCKER");
  assert.equal(classifyDefect({ authorizationFailure: true }), "HIGH");
  assert.equal(classifyDefect({ cosmetic: true }), "NORMAL");
});

test("only the release responsible can accept a high defect with mitigation, approver and expiry", () => {
  const defect = { incorrectResult: true };
  assert.deepEqual(validateRiskAcceptance(defect, { mitigation: "disable path", expiresAt: "2026-10-10T00:00:00Z", acceptedBy: "owner", approvedBy: "reviewer" }, "owner"), []);
  assert.equal(validateRiskAcceptance(defect, {}, "owner").length, 4);
  assert.match(validateRiskAcceptance({ dataLoss: true }, {}, "owner")[0], /cannot be accepted/);
});

test("evidence fingerprints are deterministic and content-sensitive", () => {
  assert.equal(evidenceFingerprint({ a: 1 }), evidenceFingerprint({ a: 1 }));
  assert.notEqual(evidenceFingerprint({ a: 1 }), evidenceFingerprint({ a: 2 }));
});
