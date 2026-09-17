import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared league context presentation", () => {
  it("reuses one selector in Home and Liga without a native league select", () => {
    const home = readFileSync(new URL("./home-dashboard.tsx", import.meta.url), "utf8");
    const league = readFileSync(new URL("./league-hub.tsx", import.meta.url), "utf8");
    expect(home).toContain('from "./league-switcher"');
    expect(league).toContain('from "./league-switcher"');
    expect(league).not.toContain("<select");
    expect(league).not.toContain("Ver miembros");
    expect(league).toContain('mine?.role==="OWNER"?<button');
    expect(league).toContain("Aún no hay clasificación");
  });
  it("retains explicit keyboard and server confirmation affordances", () => {
    const source = readFileSync(new URL("./league-switcher.tsx", import.meta.url), "utf8");
    expect(source).toContain('aria-haspopup="menu"');
    expect(source).toContain('role="menuitemradio"');
    expect(source).toContain('role="status"');
    expect(source).toContain("Ahora estás en");
    expect(source).toContain('strokeWidth="1.5"');
  });
});
