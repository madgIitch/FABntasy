import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("Sprint 19 security and privacy contracts", () => {
  it("derives actors server-side and does not accept client user ids", () => {
    const routes = ["../app/api/fantasy/team/route.ts", "../app/api/fantasy/market/route.ts", "../app/api/fantasy/leagues/route.ts", "ingestion-admin-http.ts"].map(read).join("\n");
    expect(routes).toContain("auth.getUser()");
    expect(routes).not.toMatch(/searchParams\.get\(["']user_?id|body\??\.user_?id/i);
  });

  it("keeps export allowlisted and account deletion anonymized", () => {
    const privacy = read("account-privacy.ts");
    expect(privacy).toContain("ACCOUNT_EXPORT_VERSION");
    expect(privacy).not.toContain("rawFabPayload");
    expect(privacy).not.toContain("pushSubscriptions: { select");
    expect(privacy).toContain("username: null");
    expect(privacy).toContain("displayName: null");
    expect(privacy).toContain("discoverableByUsername: false");
  });

  it("requires reauthentication and presents MFA honestly", () => {
    const actions = read("../../app/app/perfil/security-actions.ts");
    const settings = read("../../app/app/perfil/security-settings.tsx");
    expect(actions).toContain("signInWithPassword");
    expect(actions).toContain("scope: \"others\"");
    expect(settings).toContain("Próximamente");
    expect(settings).toContain("Zona de peligro");
    expect(settings).toContain("correo actual");
  });
});
