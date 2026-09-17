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

  test("opens the league switcher with keyboard and restores focus",async({page})=>{
    await page.goto("/app");
    const trigger=page.locator('button[aria-haspopup="menu"]');
    await expect(trigger).toBeVisible();
    await trigger.focus();
    await trigger.press("Enter");
    await expect(page.getByRole("menu",{name:"Cambiar de liga"})).toBeVisible();
    await expect(page.getByRole("menuitemradio",{checked:true})).toHaveCount(1);
    await expect(page.getByRole("menuitem",{name:/Gestionar mis ligas/})).toHaveAttribute("href","/app/perfil/ligas");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
});
