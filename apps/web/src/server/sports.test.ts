import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_SIZE, pageNumber } from "./sports";

describe("sports explorer contract", () => {
  it("normalizes invalid pagination without allowing unbounded pages", () => {
    expect(PAGE_SIZE).toBe(20);
    expect(pageNumber(null)).toBe(1);
    expect(pageNumber("0")).toBe(1);
    expect(pageNumber("bad-input")).toBe(1);
    expect(pageNumber("3")).toBe(3);
  });

  it("does not call Afición FAB or expose raw payload storage", () => {
    const source = readFileSync(resolve(process.cwd(), "src/server/sports.ts"), "utf8");
    expect(source).not.toMatch(/appaficion|andaluzabaloncesto|RawFabPayload|rawFabPayload/i);
    expect(source).not.toMatch(/FAB_KEY|FAB_DEVICE/i);
  });

  it("keeps the no-boxscore state explicit in the match screen", () => {
    const source = readFileSync(resolve(process.cwd(), "app/app/partidos/[id]/page.tsx"), "utf8");
    expect(source).toContain("Sin estadísticas disponibles");
    expect(source).toContain("!game.hasStatistics || !game.playerStats.length");
    expect(source).toContain("date.format(new Date(value))");
  });
});
