import { expect, test } from "@playwright/test";

const fixture = {
  gameWithStats: process.env.E2E_GAME_WITH_STATS_ID,
  gameWithoutStats: process.env.E2E_GAME_WITHOUT_STATS_ID,
  player: process.env.E2E_PLAYER_ID,
};
const ready = Boolean(process.env.E2E_STORAGE_STATE && fixture.gameWithStats && fixture.gameWithoutStats && fixture.player);

test.describe("sports explorer", () => {
  test.skip(!ready, "Requires an authenticated storage state and seeded sports IDs");

  test("shows the competition calendar", async ({ page }) => {
    await page.goto("/app/competicion#calendario");
    await expect(page.getByRole("heading", { name: "Calendario" })).toBeVisible();
    await expect(page.locator(".fixture").first()).toBeVisible();
  });

  test("shows a real boxscore when statistics exist", async ({ page }) => {
    await page.goto(`/app/partidos/${fixture.gameWithStats}`);
    await expect(page.getByRole("heading", { name: "Boxscore" })).toBeVisible();
    await expect(page.locator(".boxscore .data-row").nth(1)).toBeVisible();
  });

  test("does not invent a boxscore when statistics are missing", async ({ page }) => {
    await page.goto(`/app/partidos/${fixture.gameWithoutStats}`);
    await expect(page.getByText("Sin estadísticas disponibles")).toBeVisible();
    await expect(page.locator(".boxscore")).toHaveCount(0);
  });

  test("shows player aggregates derived from games", async ({ page }) => {
    await page.goto(`/app/jugadores/${fixture.player}`);
    await expect(page.getByLabel("Acumulados de temporada")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Partidos" })).toBeVisible();
  });
});
