import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeUsername, USERNAME_PATTERN } from "./user-profile";

describe("user profile contracts", () => {
  it("normalizes and validates public usernames", () => {
    expect(normalizeUsername("  Pepe_23 ")).toBe("pepe_23");
    expect(USERNAME_PATTERN.test("pepe_23")).toBe(true);
    expect(USERNAME_PATTERN.test("pe")).toBe(false);
    expect(USERNAME_PATTERN.test("pepe-rdz")).toBe(false);
    expect(USERNAME_PATTERN.test("pepe@email.test")).toBe(false);
  });

  it("restores legacy profiles only from the username selected in auth metadata", () => {
    const service = readFileSync(new URL("./user-profile.ts", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../../app/app/layout.tsx", import.meta.url), "utf8");
    expect(service).toContain("restoreUsernameFromAuthMetadata");
    expect(service).toContain("USERNAME_PATTERN.test(username)");
    expect(layout).toContain("user.user_metadata?.username");
    expect(layout).not.toContain("user.email?.split");
  });

  it("requires username during account creation without retaining passwords", () => {
    const form = readFileSync(new URL("../../app/auth/auth-form.tsx", import.meta.url), "utf8");
    const actions = readFileSync(new URL("../../app/auth/actions.ts", import.meta.url), "utf8");
    expect(form).toContain('mode === "register"');
    expect(form).toContain('name="username"');
    expect(form).toContain("required");
    expect(actions).toContain("data: { username }");
    expect(actions).not.toMatch(/values\?:\s*\{[^}]*password/);
  });

  it("keeps profile creation and username reservation in the auth transaction", () => {
    const migration = readFileSync(new URL("../../../../prisma/migrations/20260907000100_user_profile_account/migration.sql", import.meta.url), "utf8");
    expect(migration).toContain('UNIQUE ("username")');
    expect(migration).toContain("NEW.raw_user_meta_data ->> 'username'");
    expect(migration).toContain("invalid_username");
    expect(migration).not.toContain("NEW.email");
  });

  it("keeps profile outside the five-item primary navigation", () => {
    const layout = readFileSync(new URL("../../app/app/layout.tsx", import.meta.url), "utf8");
    const accountControls = readFileSync(new URL("../../app/app/account-controls.tsx", import.meta.url), "utf8");
    expect(accountControls).toContain('href="/app/perfil"');
    const navBlock = layout.match(/const nav = \[([\s\S]*?)\];/)?.[1] ?? "";
    expect(navBlock.match(/\["\/app/g)).toHaveLength(5);
    expect(navBlock).not.toContain("perfil");
  });

  it("replaces the application shell with league onboarding until membership exists", () => {
    const layout = readFileSync(new URL("../../app/app/layout.tsx", import.meta.url), "utf8");
    const onboarding = readFileSync(new URL("../components/league-onboarding.tsx", import.meta.url), "utf8");
    expect(layout).toContain("!profile?.leagueMemberships.length");
    expect(layout.indexOf("<LeagueOnboarding")).toBeLessThan(layout.indexOf('className="app-frame"'));
    expect(onboarding).toContain("Crear una liga");
    expect(onboarding).toContain("Tengo un enlace");
    expect(onboarding).toContain('checked={mode === "create"}');
    expect(onboarding).toContain('checked={mode === "join"}');
    expect(onboarding).toContain("<LogoutControl />");
    expect(onboarding).toContain('/app/ligas/');
  });
});
