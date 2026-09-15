import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({getUser:vi.fn(),settings:vi.fn(),save:vi.fn(),set:vi.fn(),revoke:vi.fn()}));
vi.mock("../../../src/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mocks.getUser}})}));
vi.mock("../../../src/server/notifications",()=>({
 NotificationError:class NotificationError extends Error{constructor(public code:string,public status=400){super(code)}},
 notificationSettings:mocks.settings,saveSubscription:mocks.save,setPreference:mocks.set,revokeSubscription:mocks.revoke,
}));
import { GET, POST } from "./route";
describe("notification API authorization",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:"auth-user"}}});mocks.settings.mockResolvedValue({preferences:{},subscriptions:[]})});
 it("derives the actor from the authenticated session",async()=>{const response=await GET(new Request("https://canastio.test/api/notifications"));expect(response.status).toBe(200);expect(mocks.settings).toHaveBeenCalledWith("auth-user",null)});
 it("does not expose settings without a session",async()=>{mocks.getUser.mockResolvedValue({data:{user:null}});const response=await GET(new Request("https://canastio.test/api/notifications"));expect(response.status).toBe(401);expect(mocks.settings).not.toHaveBeenCalled()});
 it("rejects cross-origin mutations before persisting",async()=>{const request=new Request("https://canastio.test/api/notifications",{method:"POST",headers:{origin:"https://evil.test","content-type":"application/json"},body:"{}"});const response=await POST(request);expect(response.status).toBe(403);expect(mocks.save).not.toHaveBeenCalled()});
 it("rejects mutations without an Origin header",async()=>{const request=new Request("https://canastio.test/api/notifications",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});expect((await POST(request)).status).toBe(403);expect(mocks.save).not.toHaveBeenCalled()});
 it("rejects a client supplied user id",async()=>{const request=new Request("https://canastio.test/api/notifications",{method:"POST",headers:{origin:"https://canastio.test","content-type":"application/json"},body:JSON.stringify({userId:"victim"})});expect((await POST(request)).status).toBe(400);expect(mocks.save).not.toHaveBeenCalled()});
});
