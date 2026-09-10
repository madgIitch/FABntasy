import { expect, test } from "@playwright/test";

const ready=Boolean(process.env.E2E_STORAGE_STATE);

test.describe("home dashboard",()=>{
  test.skip(!ready,"Requires an authenticated seeded account");

  test("keeps the editorial dashboard usable at 320px",async({page})=>{
    await page.setViewportSize({width:320,height:720});
    await page.goto("/app");
    await expect(page.locator("main")).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("opens the direct lineup action when the dashboard requests it",async({page})=>{
    await page.goto("/app");
    const action=page.getByRole("link",{name:/Preparar equipo/i});
    test.skip(await action.count()===0,"Seeded dashboard has no pending lineup");
    await action.click();
    await expect(page).toHaveURL(/\/app\/mi-equipo/);
  });
});
