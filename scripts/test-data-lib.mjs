import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const manifestPath = resolve(root, "seeding/manifest/scenarios.json");

export function loadManifest(path = manifestPath) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function validateManifest(manifest) {
  const errors = [];
  if (manifest.schemaVersion !== "canastio-test-scenarios.v1") errors.push("schemaVersion no soportada");
  const requiredProfiles = ["small", "realistic", "stress"];
  for (const name of requiredProfiles) {
    const profile = manifest.profiles?.[name];
    if (!profile) errors.push(`falta el perfil ${name}`);
    else for (const field of ["realTeams", "players", "managers", "rounds"]) {
      if (!Number.isInteger(profile[field]) || profile[field] <= 0) errors.push(`${name}.${field} debe ser un entero positivo`);
    }
  }
  const ids = new Set();
  for (const scenario of manifest.scenarios ?? []) {
    if (!/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(scenario.id ?? "")) errors.push(`scenario id inválido: ${scenario.id}`);
    if (ids.has(scenario.id)) errors.push(`scenario duplicado: ${scenario.id}`);
    ids.add(scenario.id);
    if (!/^T(?:[0-9]|1[01])$/.test(scenario.checkpoint ?? "")) errors.push(`checkpoint inválido en ${scenario.id}`);
    for (const profile of scenario.profiles ?? requiredProfiles) {
      if (!requiredProfiles.includes(profile)) errors.push(`perfil desconocido ${profile} en ${scenario.id}`);
    }
  }
  if (ids.size !== 15) errors.push(`se esperaban 15 escenarios canónicos; encontrados ${ids.size}`);
  return errors;
}

export function assertSafeRunId(value) {
  if (!/^[a-z0-9][a-z0-9_-]{5,63}$/.test(value ?? "")) {
    throw new Error("run-id debe tener 6-64 caracteres [a-z0-9_-]");
  }
  return value;
}

export function assertClock(value) {
  if (!value || Number.isNaN(Date.parse(value)) || !/(Z|[+-]\d\d:\d\d)$/.test(value)) {
    throw new Error("clock debe ser ISO-8601 e incluir zona horaria");
  }
  return value;
}

export function assertTestDatabase(env = process.env) {
  if (env.CANASTIO_TEST_DATABASE !== "1") throw new Error("CANASTIO_TEST_DATABASE=1 es obligatorio");
  const raw = env.TEST_DATABASE_URL;
  if (!raw) throw new Error("TEST_DATABASE_URL es obligatorio; DATABASE_URL no se usa implícitamente");
  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname.slice(1)).toLowerCase();
  const target = `${url.hostname}/${database}`;
  const safeHost = ["localhost", "127.0.0.1", "::1", "db"].includes(url.hostname) || target.includes("test") || target.includes("dev");
  if (!safeHost) throw new Error(`base rechazada por la guarda de seguridad: ${target}`);
  return raw;
}

export function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) throw new Error(`argumento inesperado: ${token}`);
    const key = token.slice(2);
    const value = rest[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`falta valor para --${key}`);
    options[key] = value;
    i += 1;
  }
  return { command, options };
}
