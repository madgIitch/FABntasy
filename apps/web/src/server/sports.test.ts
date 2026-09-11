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
    expect(source).toContain('<LiveGameRefresher active={game.status === "live"} />');
    expect(source).toContain('label: "Local"');
    expect(source).toContain('label: "Visitante"');
    expect(source).toContain("statsByTeam(game.homeTeam.id)");
    expect(source).toContain("statsByTeam(game.awayTeam.id)");
    expect(source).toContain("maximumFractionDigits: 1");
    expect(source).toContain("formatMinutes(stat.minutesPlayed)");
  });

  it("refreshes live match data without requiring a manual reload", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/live-game-refresher.tsx"), "utf8");
    expect(source).toContain("30_000");
    expect(source).toContain("router.refresh()");
    expect(source).toContain('document.addEventListener("visibilitychange"');
  });
});
