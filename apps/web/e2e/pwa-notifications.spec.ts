import { expect, test } from "@playwright/test";
import vm from "node:vm";

function serviceWorkerHarness(source:string,windows:Array<{navigate?:(url:string)=>Promise<void>;focus:()=>Promise<void>}>=[]){
 const listeners:Record<string,(event:{notification:{data?:{destination?:string};close:()=>void};waitUntil:(promise:Promise<unknown>)=>void})=>void>={};
 let opened:string|undefined,waited:Promise<unknown>|undefined;
 const context={URL,self:{location:{origin:"https://canastio.test"},addEventListener:(name:string,handler:typeof listeners[string])=>{listeners[name]=handler}},caches:{},clients:{matchAll:async()=>windows,openWindow:async(destination:string)=>{opened=destination}}};
 vm.runInNewContext(source,context);
 return {click:async(destination:string)=>{listeners.notificationclick({notification:{data:{destination},close:()=>undefined},waitUntil:promise=>{waited=promise}});await waited},opened:()=>opened};
}

test("manifest and service worker expose only the public PWA shell",async({request})=>{
 const manifest=await (await request.get("/manifest.webmanifest")).json();
 expect(manifest).toMatchObject({start_url:"/app",display:"standalone"});
 expect(manifest.icons).toEqual(expect.arrayContaining([expect.objectContaining({sizes:"192x192",purpose:"maskable"}),expect.objectContaining({sizes:"512x512",purpose:"any"})]));
 const worker=await (await request.get("/sw.js")).text();
 expect(worker).not.toContain("caches.put");
 expect(worker).toContain("notificationclick");
 expect(worker).toContain("safeDestination");
 expect(worker).toContain("client.navigate(destination)");
});

test("notification clicks normalize destinations and reuse a window",async({request})=>{
 const worker=await (await request.get("/sw.js")).text(),navigateCalls:string[]=[],focusCalls:string[]=[];
 const existing={navigate:async(destination:string)=>{navigateCalls.push(destination)},focus:async()=>{focusCalls.push("focused")}};
 const reused=serviceWorkerHarness(worker,[existing]);
 await reused.click("/app/jornada?round=2#score");
 expect(navigateCalls).toEqual(["/app/jornada?round=2#score"]);expect(focusCalls).toEqual(["focused"]);expect(reused.opened()).toBeUndefined();
 for(const unsafe of ["https://evil.test","//evil.test/path","/app\\evil","/outside","/app/%2e%2e/admin"]){const fresh=serviceWorkerHarness(worker);await fresh.click(unsafe);expect(fresh.opened()).toBe("/app")}
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
