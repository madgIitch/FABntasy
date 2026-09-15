import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";
import { sanitizedPushError } from "../../../../packages/domain/notifications";

const webRoot=resolve(__dirname,"../..");
describe("production Push data minimization",()=>{
 it("keeps server credentials out of public and client artifacts",()=>{
  const clientArtifacts=["public/sw.js","app/app/perfil/pwa-settings.tsx","app/app/perfil/logout-control.tsx"];
  for(const file of clientArtifacts){const contents=readFileSync(resolve(webRoot,file),"utf8");expect(contents).not.toMatch(/VAPID_PRIVATE_KEY|CANASTIO_PUSH_JOB_SECRET|SUPABASE_SERVICE_ROLE_KEY/)}
 });
 it("reduces provider failures to bounded codes",()=>{
  for(const status of [0,400,401,403,404,410,413,429,500,503])expect(sanitizedPushError(status)).toMatch(/^(SEND_FAILED|HTTP_(400|401|403|404|410|413|429|5XX))$/);
  expect(JSON.stringify({error:sanitizedPushError(503)})).not.toContain("endpoint");
 });
});
