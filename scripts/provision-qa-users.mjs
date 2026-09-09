import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");
const outputPath = resolve(root, ".local", "qa-users.json");

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

loadEnv(envPath);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");

const previous = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : null;
const sharedPassword = previous?.sharedPassword || randomBytes(18).toString("base64url") + "Aa1!";
const accounts = Array.from({ length: 21 }, (_, slot) => {
  const suffix = String(slot).padStart(2, "0");
  return { slot: suffix, email: `canastio.qa.${suffix}@example.com`, username: `qa_manager_${suffix}` };
});

const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" };
async function request(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/auth/v1${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${response.status} ${body.msg || body.message || body.error || "error desconocido"}`);
  return body;
}

const listed = await request("/admin/users?page=1&per_page=1000");
const byEmail = new Map((listed.users || []).map((user) => [user.email?.toLowerCase(), user]));
const result = [];

for (const account of accounts) {
  const existing = byEmail.get(account.email);
  const payload = {
    email: account.email,
    password: sharedPassword,
    email_confirm: true,
    user_metadata: { username: account.username, qa_slot: account.slot, synthetic: true },
  };
  const user = existing
    ? await request(`/admin/users/${existing.id}`, { method: "PUT", body: JSON.stringify(payload) })
    : await request("/admin/users", { method: "POST", body: JSON.stringify(payload) });
  result.push({ slot: account.slot, authUserId: user.id, email: user.email, username: account.username });
  process.stdout.write(`${existing ? "actualizado" : "creado"} ${account.username}\n`);
}

mkdirSync(resolve(root, ".local"), { recursive: true });
writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), supabaseUrl, sharedPassword, users: result }, null, 2) + "\n", { mode: 0o600 });
process.stdout.write(`OK: ${result.length} usuarios. Credenciales e identity map: ${outputPath}\n`);
