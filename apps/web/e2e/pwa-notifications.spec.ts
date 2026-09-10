import { expect, test } from "@playwright/test";

test("manifest and service worker expose only the public PWA shell",async({request})=>{
 const manifest=await (await request.get("/manifest.webmanifest")).json();
 expect(manifest).toMatchObject({start_url:"/app",display:"standalone"});
 expect(manifest.icons).toEqual(expect.arrayContaining([expect.objectContaining({sizes:"192x192",purpose:"maskable"}),expect.objectContaining({sizes:"512x512",purpose:"any"})]));
 const worker=await (await request.get("/sw.js")).text();
 expect(worker).not.toContain("caches.put");
 expect(worker).toContain("notificationclick");
});

test.describe("profile PWA controls",()=>{
 test.skip(!process.env.E2E_STORAGE_STATE,"Requires an authenticated seeded account");
 test("opens the install prompt only after a user gesture",async({page})=>{
  await page.goto("/app/perfil");
  await page.evaluate(()=>{const event=new Event("beforeinstallprompt") as Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"}>};event.prompt=async()=>{document.body.dataset.installPrompted="true"};event.userChoice=Promise.resolve({outcome:"accepted"});window.dispatchEvent(event)});
  await expect(page.locator("body")).not.toHaveAttribute("data-install-prompted","true");
  await page.getByRole("button",{name:"Instalar"}).click();
  await expect(page.locator("body")).toHaveAttribute("data-install-prompted","true");
 });
});
