import { beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({getUser:vi.fn(),send:vi.fn(),sender:vi.fn()}));
vi.mock("../../../../src/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mocks.getUser}})}));
vi.mock("../../../../src/server/notifications",()=>({
 NotificationError:class NotificationError extends Error{constructor(public code:string,public status=400){super(code)}},
 sendDeviceTest:mocks.send,
}));
vi.mock("../../../../src/server/web-push-sender",()=>({createWebPushSender:()=>mocks.sender}));
import { POST } from "./route";

describe("authenticated Push test route",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:"auth-user"}}});mocks.send.mockResolvedValue({accepted:true})});
 const request=(body:unknown,origin?:string)=>new Request("https://canastio.test/api/notifications/test",{method:"POST",headers:{"content-type":"application/json",...(origin?{origin}:{})},body:JSON.stringify(body)});
 it("requires a same-origin user gesture request",async()=>{expect((await POST(request({deviceId:"device"}))).status).toBe(403);expect(mocks.send).not.toHaveBeenCalled()});
 it("rejects client identity and never echoes subscription secrets",async()=>{expect((await POST(request({userId:"victim",deviceId:"device"},"https://canastio.test"))).status).toBe(400);expect(mocks.send).not.toHaveBeenCalled();const response=await POST(request({deviceId:"device"},"https://canastio.test"));expect(response.status).toBe(202);const text=await response.text();expect(text).not.toMatch(/endpoint|p256dh|auth/)});
});
