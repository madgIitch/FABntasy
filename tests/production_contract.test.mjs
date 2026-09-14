import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
test("production contract is HTTPS, immutable and recoverable", async () => {
  const config = JSON.parse(await read("infrastructure/production.json"));
  assert.match(config.canonicalOrigin, /^https:\/\//);
  assert.equal(config.deployment.digestOnly, true);
  assert.equal(config.deployment.migrationsAreSeparate, true);
  assert.equal(config.deployment.replicas.scheduler, 1);
  assert.equal(config.database.encrypted, true);
});
test("web applies defensive headers globally", async () => {
  const source = await read("apps/web/next.config.ts");
  for (const header of ["Strict-Transport-Security", "X-Content-Type-Options", "Permissions-Policy", "Cross-Origin-Opener-Policy", "Cross-Origin-Resource-Policy"]) assert.match(source, new RegExp(header));
});
test("backup and release preserve separation of duties", async () => {
  const release = await read(".github/workflows/production-release.yml");
  const backup = await read(".github/workflows/database-backup.yml");
  assert.ok(release.indexOf("prisma migrate deploy") < release.indexOf("Promote immutable artifacts"));
  assert.match(backup, /pg_dump/); assert.match(backup, /age --recipient/); assert.match(backup, /retention-days: 30/);
});
