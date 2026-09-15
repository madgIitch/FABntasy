import { beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({profile:vi.fn(),endpoint:vi.fn(),upsert:vi.fn(),revoke:vi.fn(),preferences:vi.fn(),subscriptions:vi.fn()}));
vi.mock("./db",()=>({db:{
 userProfile:{findUnique:mocks.profile},
 pushSubscription:{findUnique:mocks.endpoint,upsert:mocks.upsert,updateMany:mocks.revoke,findMany:mocks.subscriptions},
 notificationPreference:{findMany:mocks.preferences},
}}));
import { notificationSettings,revokeSubscription,saveSubscription } from "./notifications";

const authUserId="00000000-0000-0000-0000-000000000001",profileId="00000000-0000-0000-0000-000000000011",deviceId="00000000-0000-4000-8000-000000000021";
const input={deviceId,subscription:{endpoint:"https://push.example/device",keys:{p256dh:"public-key",auth:"auth-key"}}};
describe("Push subscription ownership",()=>{
 beforeEach(()=>{vi.clearAllMocks();process.env.VAPID_KEY_VERSION="v2";mocks.profile.mockResolvedValue({id:profileId});mocks.endpoint.mockResolvedValue(null);mocks.upsert.mockResolvedValue({id:"subscription",deviceId,vapidKeyVersion:"v2"});mocks.revoke.mockResolvedValue({count:1});mocks.preferences.mockResolvedValue([]);mocks.subscriptions.mockResolvedValue([])});
 it("registers or reactivates exactly one endpoint for the session actor",async()=>{await saveSubscription(authUserId,input,"browser",()=>new Date("2026-09-15T10:00:00Z"));expect(mocks.upsert).toHaveBeenCalledTimes(1);expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({where:{endpoint:input.subscription.endpoint},update:expect.objectContaining({revokedAt:null,revokedReason:null,vapidKeyVersion:"v2"})}))});
 it("never transfers an endpoint owned by another user",async()=>{mocks.endpoint.mockResolvedValue({userProfileId:"00000000-0000-0000-0000-000000000099"});await expect(saveSubscription(authUserId,input)).rejects.toMatchObject({code:"SUBSCRIPTION_OWNED_BY_ANOTHER_USER",status:409});expect(mocks.upsert).not.toHaveBeenCalled()});
 it("revokes only the current device",async()=>{await revokeSubscription(authUserId,{deviceId});expect(mocks.revoke).toHaveBeenCalledWith({where:{userProfileId:profileId,revokedAt:null,deviceId},data:expect.objectContaining({revokedReason:"USER"})})});
 it("exposes rotation state without endpoint or key material",async()=>{mocks.subscriptions.mockResolvedValue([{id:"subscription",deviceId,vapidKeyVersion:"v1",lastSeenAt:new Date()}]);const settings=await notificationSettings(authUserId,deviceId);expect(settings.device).toEqual({registered:false,requiresResubscribe:true});expect(JSON.stringify(settings)).not.toMatch(/push\.example|p256dh|auth-key/)});
});
