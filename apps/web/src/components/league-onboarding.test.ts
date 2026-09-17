import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("multiple league onboarding", () => {
  it("keeps preview onboarding while separating active league from management in OPEN", () => {
    const layout = readFileSync(new URL("../../app/app/layout.tsx", import.meta.url), "utf8");
    const onboarding = readFileSync(new URL("./league-onboarding.tsx", import.meta.url), "utf8");
    const hub = readFileSync(new URL("./league-hub.tsx", import.meta.url), "utf8");
    const directory = readFileSync(new URL("./league-directory.tsx", import.meta.url), "utf8");
    const form = readFileSync(new URL("./league-management-form.tsx", import.meta.url), "utf8");
    expect(layout).not.toMatch(/leagueMemberships:[\s\S]{0,180}take:\s*1/);
    expect(layout).toContain("previewLeagues={previewLeagues}");
    expect(onboarding).toContain("Añadir otra liga");
    expect(onboarding).toContain("previewLeagues.map");
    expect(hub).not.toContain("Crear otra liga");
    expect(hub).not.toContain("Unirme a otra liga");
    expect(hub).toContain("Cambiar de liga activa");
    expect(directory).toContain("Crear nueva liga");
    expect(directory).toContain("Unirme con código");
    expect(form).toContain("/api/fantasy/leagues/active");
  });
});
