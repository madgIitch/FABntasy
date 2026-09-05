import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("auth and PWA security contracts", () => {
  it("allows only local callback destinations", () => {
    expect(safeNextPath("/actualizar-clave")).toBe("/actualizar-clave");
    expect(safeNextPath("//attacker.test")).toBe("/app");
    expect(safeNextPath("/\\attacker.test")).toBe("/app");
    expect(safeNextPath("https://attacker.test")).toBe("/app");
  });

  it("never caches mutations or authenticated pages", () => {
    const sw = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
    expect(sw).toContain('event.request.method!=="GET"');
    expect(sw).not.toContain('"/app"');
  });

  it("declares a standalone manifest", () => {
    const manifest = JSON.parse(readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/app");
  });
});
