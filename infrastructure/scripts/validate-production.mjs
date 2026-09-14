import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const file = new URL("../production.json", import.meta.url);
const config = JSON.parse(await readFile(file, "utf8"));
const fail = (message) => { throw new Error(`production contract: ${message}`); };
if (config.schemaVersion !== "fabntasy.production.v1") fail("unsupported schema");
if (!config.canonicalOrigin.startsWith("https://") || new URL(config.canonicalOrigin).pathname !== "/") fail("canonicalOrigin must be an HTTPS origin");
for (const key of ["release", "regions", "providers", "owners", "artifacts", "database", "deployment", "pwa"]) if (!config[key]) fail(`missing ${key}`);
if (!config.database.encrypted || config.database.backupFrequencyHours > 24 || config.database.retentionDays < 7) fail("backup policy is unsafe");
if (!config.deployment.digestOnly || !config.deployment.migrationsAreSeparate || config.deployment.replicas.scheduler !== 1) fail("deployment invariants are unsafe");
console.log(JSON.stringify({ status: "OK", schemaVersion: config.schemaVersion, configSha256: createHash("sha256").update(JSON.stringify(config)).digest("hex") }));
