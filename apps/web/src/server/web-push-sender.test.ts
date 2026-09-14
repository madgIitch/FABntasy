import { describe,expect,it } from "vitest";
import { validateVapidConfiguration } from "./web-push-sender";
const valid={NODE_ENV:"test",NEXT_PUBLIC_VAPID_PUBLIC_KEY:"A".repeat(87),VAPID_PRIVATE_KEY:"b".repeat(43),VAPID_SUBJECT:"mailto:ops@example.test",VAPID_KEY_VERSION:"v2"} as NodeJS.ProcessEnv;
describe("VAPID production configuration",()=>{
 it("accepts valid server credentials",()=>expect(validateVapidConfiguration(valid).keyVersion).toBe("v2"));
 it.each(["NEXT_PUBLIC_VAPID_PUBLIC_KEY","VAPID_PRIVATE_KEY","VAPID_SUBJECT"])("fails closed when %s is missing",key=>{const env={...valid};delete env[key];expect(()=>validateVapidConfiguration(env)).toThrow()});
 it("rejects malformed subjects and versions",()=>{expect(()=>validateVapidConfiguration({...valid,VAPID_SUBJECT:"ops@example.test"})).toThrow("VAPID_SUBJECT_INVALID");expect(()=>validateVapidConfiguration({...valid,VAPID_KEY_VERSION:"spaces forbidden"})).toThrow("VAPID_KEY_VERSION_INVALID")});
});
