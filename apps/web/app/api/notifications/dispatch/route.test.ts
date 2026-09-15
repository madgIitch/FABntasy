import { beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({dispatch:vi.fn(),sender:vi.fn()}));
vi.mock("../../../../src/server/notifications",()=>({
 NotificationError:class NotificationError extends Error{constructor(public code:string,public status=400){super(code)}},
 dispatchNotification:mocks.dispatch,
}));
vi.mock("../../../../src/server/web-push-sender",()=>({createWebPushSender:()=>mocks.sender}));
import { POST } from "./route";

describe("internal Push dispatcher route",()=>{
 beforeEach(()=>{vi.clearAllMocks();process.env.CANASTIO_PUSH_JOB_SECRET="job-secret-for-tests";mocks.dispatch.mockResolvedValue({delivered:1,skipped:false})});
 const request=(body:unknown,token?:string)=>new Request("https://canastio.test/api/notifications/dispatch",{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
 it("has no public dispatch",async()=>{expect((await POST(request({}))).status).toBe(401);expect(mocks.dispatch).not.toHaveBeenCalled()});
 it("rejects a client userId even with the job secret",async()=>{expect((await POST(request({userId:"victim"},"job-secret-for-tests"))).status).toBe(400);expect(mocks.dispatch).not.toHaveBeenCalled()});
 it("returns only aggregate delivery state",async()=>{const response=await POST(request({userProfileId:"profile",intent:"ROUND_RESULT",eventKey:"event",title:"Title",body:"Body"},"job-secret-for-tests"));expect(response.status).toBe(200);expect(await response.text()).not.toMatch(/endpoint|p256dh|private/i)});
});
