import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(()=>({
 preference: vi.fn(), membership: vi.fn(), subscriptions: vi.fn(), createDelivery: vi.fn(), findDelivery: vi.fn(), claim: vi.fn(), updateDelivery: vi.fn(), revoke: vi.fn(),
}));
vi.mock("./db",()=>({db:{
 notificationPreference:{findUnique:mocks.preference},
 pushSubscription:{findMany:mocks.subscriptions,update:mocks.revoke},
 leagueMembership:{findFirst:mocks.membership},
 notificationDelivery:{create:mocks.createDelivery,findUnique:mocks.findDelivery,updateMany:mocks.claim,update:mocks.updateDelivery},
}}));
import { dispatchNotification } from "./notifications";

const event={userProfileId:"00000000-0000-0000-0000-000000000001",intent:"ROUND_RESULT" as const,eventKey:"round:4:revision:1",title:"Jornada calculada",body:"Ya puedes consultar tus puntos",destination:"/app/jornada"};
describe("notification dispatcher",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.preference.mockResolvedValue({enabled:true});mocks.subscriptions.mockResolvedValue([{id:"s1",endpoint:"https://push.test/1",p256dh:"p",auth:"a"}]);mocks.createDelivery.mockResolvedValue({id:"d1",status:"PENDING",attemptCount:0});mocks.updateDelivery.mockResolvedValue({});mocks.revoke.mockResolvedValue({})});
 it("does not create deliveries when the preference is disabled",async()=>{mocks.preference.mockResolvedValue({enabled:false});const send=vi.fn();expect(await dispatchNotification(event,send)).toEqual({delivered:0,skipped:true});expect(send).not.toHaveBeenCalled()});
 it("does not disclose a league event to a non-member",async()=>{mocks.membership.mockResolvedValue(null);const send=vi.fn();expect(await dispatchNotification({...event,leagueId:"league-2"},send)).toEqual({delivered:0,skipped:true});expect(send).not.toHaveBeenCalled()});
 it("claims a unique delivery and sends a minimal safe payload",async()=>{const send=vi.fn().mockResolvedValue(undefined);expect(await dispatchNotification(event,send)).toEqual({delivered:1,skipped:false});expect(JSON.parse(send.mock.calls[0][1])).toEqual(expect.objectContaining({title:event.title,body:event.body,destination:"/app/jornada"}));expect(mocks.updateDelivery).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:"DELIVERED"})}))});
 it("does not double-send a concurrently pending event",async()=>{mocks.createDelivery.mockRejectedValue({code:"P2002"});mocks.findDelivery.mockResolvedValue({id:"d1",status:"PENDING",attemptCount:0});const send=vi.fn();expect(await dispatchNotification(event,send)).toEqual({delivered:0,skipped:false});expect(send).not.toHaveBeenCalled()});
 it("revokes a subscription rejected as gone",async()=>{const error=Object.assign(new Error("gone"),{statusCode:410});await dispatchNotification(event,vi.fn().mockRejectedValue(error));expect(mocks.revoke).toHaveBeenCalledWith({where:{id:"s1"},data:{revokedAt:expect.any(Date)}});expect(mocks.updateDelivery).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:"EXPIRED",lastErrorCode:"HTTP_410"})}))});
});
