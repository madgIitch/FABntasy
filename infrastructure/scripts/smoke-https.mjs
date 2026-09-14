const origin = process.env.PRODUCTION_ORIGIN;
if (!origin || !origin.startsWith("https://")) throw new Error("PRODUCTION_ORIGIN must be HTTPS");
const expected = new URL(origin).origin;
const paths = ["/", "/login", "/app", "/app/jornada", "/app/mi-equipo", "/app/mercado", "/app/ligas", "/app/ranking", "/manifest.webmanifest", "/sw.js"];
for (const path of paths) {
  const response = await fetch(expected + path, { redirect: "manual", headers: { "user-agent": "fabntasy-release-smoke/1.0" } });
  if (response.status >= 500) throw new Error(`${path}: ${response.status}`);
  const location = response.headers.get("location");
  if (location && new URL(location, expected).origin !== expected) throw new Error(`${path}: cross-origin redirect`);
  for (const header of ["strict-transport-security", "x-content-type-options", "referrer-policy", "cross-origin-opener-policy"]) if (!response.headers.get(header)) throw new Error(`${path}: missing ${header}`);
  for (const cookie of response.headers.getSetCookie?.() ?? []) {
    if (/auth|session/i.test(cookie) && !/HttpOnly/i.test(cookie)) throw new Error(`${path}: session cookie without HttpOnly`);
    if (/auth|session/i.test(cookie) && !/Secure/i.test(cookie)) throw new Error(`${path}: session cookie without Secure`);
    if (/auth|session/i.test(cookie) && !/SameSite=(Lax|Strict)/i.test(cookie)) throw new Error(`${path}: unsafe SameSite`);
  }
}
console.log(JSON.stringify({ status: "OK", origin: expected, routes: paths.length }));
