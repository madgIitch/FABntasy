import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("multiple league onboarding", () => {
  it("allows adding more leagues in preview and after the league is active", () => {
    const layout = readFileSync(new URL("../../app/app/layout.tsx", import.meta.url), "utf8");
    const onboarding = readFileSync(new URL("./league-onboarding.tsx", import.meta.url), "utf8");
    const hub = readFileSync(new URL("./league-hub.tsx", import.meta.url), "utf8");
    expect(layout).not.toMatch(/leagueMemberships:[\s\S]{0,180}take:\s*1/);
    expect(layout).toContain("previewLeagues={previewLeagues}");
    expect(onboarding).toContain("Añadir otra liga");
    expect(onboarding).toContain("previewLeagues.map");
    expect(hub).toContain("Crear otra liga");
    expect(hub).toContain("Unirme a otra liga");
  });
});
