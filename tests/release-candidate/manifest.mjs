import { createHash } from "node:crypto";

export const RC_COMPETITION = "1ª Provincial Senior Masculina de Sevilla";
export const RC_SEASON = "2026/2027";
export const RC_TIMEZONE = "Europe/Madrid";
export const RC_BROWSERS = ["chromium", "firefox", "webkit"];
export const RC_VIEWPORTS = ["375x812", "1440x900"];
export const RC_CRITICAL_FLOWS = [
  "authentication",
  "private-league",
  "market-roster",
  "lineup-cutoff",
  "partial-round",
  "publication-ranking",
  "correction-republication",
  "degraded-state",
];

const forbiddenKey = /(authorization|cookie|password|secret|token|fab[_-]?key|id[_-]?dispositivo|database[_-]?url|email)/i;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isDigest = (value) => typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
const isIsoDate = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));

export function findSensitivePaths(value, path = "$") {
  if (Array.isArray(value)) return value.flatMap((item, index) => findSensitivePaths(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(forbiddenKey.test(key) ? [`${path}.${key}`] : []),
    ...findSensitivePaths(child, `${path}.${key}`),
  ]);
}

export function validateReleaseCandidateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return ["manifest must be an object"];
  if (manifest.schemaVersion !== "fabntasy-rc.v1") errors.push("schemaVersion must be fabntasy-rc.v1");
  if (manifest.competition?.name !== RC_COMPETITION) errors.push(`competition.name must be ${RC_COMPETITION}`);
  if (!manifest.competition?.fabCompetitionId || !manifest.competition?.fabCategoryCompetitionId) errors.push("competition FAB IDs are required");
  if (manifest.competition?.season !== RC_SEASON) errors.push(`competition.season must be ${RC_SEASON}`);
  if (!manifest.round?.fabRoundId || !Number.isInteger(manifest.round?.number)) errors.push("round FAB ID and integer number are required");
  if (manifest.window?.timezone !== RC_TIMEZONE || !isIsoDate(manifest.window?.startsAt) || !isIsoDate(manifest.window?.endsAt)) errors.push("window requires ISO dates and Europe/Madrid");
  if (Date.parse(manifest.window?.startsAt) >= Date.parse(manifest.window?.endsAt)) errors.push("window startsAt must precede endsAt");
  if (!manifest.ruleSet?.id || !manifest.ruleSet?.version) errors.push("active ruleset ID and version are required");
  if (!Array.isArray(manifest.testLeagueIds) || manifest.testLeagueIds.length === 0) errors.push("at least one test league ID is required");
  if (!manifest.release?.commit || !isDigest(manifest.release?.webDigest) || !isDigest(manifest.release?.ingestorDigest)) errors.push("release commit and sha256 digests are required");
  if (!manifest.rollbackBaseline?.release || !manifest.rollbackBaseline?.commit || !isDigest(manifest.rollbackBaseline?.webDigest) || !isDigest(manifest.rollbackBaseline?.ingestorDigest)) errors.push("rollback baseline release, commit and digests are required");
  if (!manifest.responsible?.release || !manifest.responsible?.operations) errors.push("release and operations responsible identifiers are required");
  if (findSensitivePaths(manifest).length) errors.push("manifest contains forbidden sensitive keys");
  return errors;
}

export function classifyDefect(defect) {
  if (defect?.blocksCriticalFlow || defect?.dataLoss || defect?.dataCorruption || defect?.criticalVulnerability) return "BLOCKER";
  if (defect?.incorrectResult || defect?.authorizationFailure || defect?.economicDuplication || defect?.severeDegradationWithoutSafeFallback) return "HIGH";
  return "NORMAL";
}

export function validateRiskAcceptance(defect, acceptance, releaseResponsible) {
  const severity = classifyDefect(defect);
  if (!new Set(["BLOCKER", "HIGH"]).has(severity)) return [];
  if (severity === "BLOCKER") return ["blocker defects cannot be accepted for the release candidate"];
  const errors = [];
  if (!acceptance?.mitigation) errors.push("high defect acceptance requires mitigation");
  if (!acceptance?.expiresAt || !isIsoDate(acceptance.expiresAt)) errors.push("high defect acceptance requires an ISO expiry");
  if (acceptance?.acceptedBy !== releaseResponsible) errors.push("high defect acceptance requires the designated release responsible");
  if (!acceptance?.approvedBy) errors.push("high defect acceptance requires an approver");
  return errors;
}

export function evidenceFingerprint(value) {
  return `sha256:${sha256(JSON.stringify(value))}`;
}
