import { randomUUID } from "node:crypto";
import { isNotificationIntent, NOTIFICATION_INTENTS, PUSH_CLAIM_LEASE_MS, PUSH_MAX_ATTEMPTS, pushRetryDelay, safeNotificationDestination, sanitizedPushError, type NotificationIntent } from "../../../../packages/domain/notifications";
import { db } from "./db";

export class NotificationError extends Error { constructor(public code: string, public status = 400) { super(code); } }
export type Clock = () => Date;
const systemClock: Clock = () => new Date();
export function vapidKeyVersion() { return process.env.VAPID_KEY_VERSION?.trim() || "v1"; }
export async function profileIdForAuth(authUserId: string) { const profile = await db.userProfile.findUnique({ where: { authUserId }, select: { id: true } }); if (!profile) throw new NotificationError("PROFILE_NOT_FOUND", 404); return profile.id; }

export function parseSubscription(input: unknown) {
  const wrapper = input as { subscription?: unknown; deviceId?: unknown };
  const value = (wrapper?.subscription ?? input) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (!value || typeof value.endpoint !== "string" || value.endpoint.length > 4096 || !value.endpoint.startsWith("https://")) throw new NotificationError("INVALID_SUBSCRIPTION");
  const p256dh = value.keys?.p256dh, auth = value.keys?.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string" || !p256dh || !auth || p256dh.length > 512 || auth.length > 512) throw new NotificationError("INVALID_SUBSCRIPTION");
  const deviceId = wrapper?.deviceId;
  if (deviceId !== undefined && (typeof deviceId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId))) throw new NotificationError("INVALID_DEVICE_ID");
  return { endpoint: value.endpoint, p256dh, auth, ...(deviceId ? { deviceId } : {}) };
}

export async function notificationSettings(authUserId: string, deviceId?: string | null) {
  const userProfileId = await profileIdForAuth(authUserId);
  const [preferences, subscriptions] = await Promise.all([
    db.notificationPreference.findMany({ where: { userProfileId } }),
    db.pushSubscription.findMany({ where: { userProfileId, revokedAt: null }, select: { id: true, deviceId: true, vapidKeyVersion: true, lastSeenAt: true } }),
  ]);
  const enabled = new Map(preferences.map(item => [item.intent, item.enabled])), currentVersion = vapidKeyVersion();
  const currentDevice = deviceId ? subscriptions.find(item => item.deviceId === deviceId) : undefined;
  return { preferences: Object.fromEntries(NOTIFICATION_INTENTS.map(intent => [intent, enabled.get(intent) ?? false])), device: { registered: Boolean(currentDevice && currentDevice.vapidKeyVersion === currentVersion), requiresResubscribe: Boolean(currentDevice && currentDevice.vapidKeyVersion !== currentVersion) }, activeDeviceCount: subscriptions.length };
}

export async function saveSubscription(authUserId: string, input: unknown, userAgent?: string | null, clock: Clock = systemClock) {
  const userProfileId = await profileIdForAuth(authUserId), subscription = parseSubscription(input), now = clock();
  const existing = await db.pushSubscription.findUnique({ where: { endpoint: subscription.endpoint }, select: { userProfileId: true } });
  if (existing && existing.userProfileId !== userProfileId) throw new NotificationError("SUBSCRIPTION_OWNED_BY_ANOTHER_USER", 409);
  return db.pushSubscription.upsert({ where: { endpoint: subscription.endpoint }, create: { ...subscription, userProfileId, vapidKeyVersion: vapidKeyVersion(), userAgent: userAgent?.slice(0, 512), lastSeenAt: now }, update: { p256dh: subscription.p256dh, auth: subscription.auth, deviceId: subscription.deviceId, vapidKeyVersion: vapidKeyVersion(), userAgent: userAgent?.slice(0, 512), revokedAt: null, revokedReason: null, lastSeenAt: now }, select: { id: true, deviceId: true, vapidKeyVersion: true, lastSeenAt: true } });
}

export async function revokeSubscription(authUserId: string, input?: unknown, clock: Clock = systemClock) {
  const userProfileId = await profileIdForAuth(authUserId);
  const value = typeof input === "object" && input ? input as { endpoint?: unknown; deviceId?: unknown } : { endpoint: input };
  const selector = typeof value.endpoint === "string" ? { endpoint: value.endpoint } : typeof value.deviceId === "string" ? { deviceId: value.deviceId } : null;
  if (!selector) throw new NotificationError("DEVICE_REQUIRED");
  return db.pushSubscription.updateMany({ where: { userProfileId, revokedAt: null, ...selector }, data: { revokedAt: clock(), revokedReason:"USER" } });
}

export async function setPreference(authUserId: string, intentValue: unknown, enabled: unknown) {
  if (!isNotificationIntent(intentValue) || typeof enabled !== "boolean") throw new NotificationError("INVALID_PREFERENCE");
  const userProfileId = await profileIdForAuth(authUserId);
  return db.notificationPreference.upsert({ where: { userProfileId_intent: { userProfileId, intent: intentValue } }, create: { userProfileId, intent: intentValue, enabled }, update: { enabled }, select: { intent: true, enabled: true } });
}

export type PushEvent = { userProfileId: string; leagueId?: string; intent: NotificationIntent; eventKey: string; title: string; body: string; destination?: string };
export type PushSender = (subscription: { endpoint: string; p256dh: string; auth: string }, payload: string) => Promise<void>;
type PushFailure = Error & { statusCode?: number; headers?: Record<string, string | string[] | undefined> };
function retryAfter(error: PushFailure) { const raw = error.headers?.["retry-after"], seconds = Number(Array.isArray(raw) ? raw[0] : raw); return Number.isFinite(seconds) && seconds >= 0 ? seconds : null; }
function permanentStatus(status: number) { return [400, 401, 403, 404, 410, 413].includes(status); }

export async function sendDeviceTest(authUserId:string,deviceId:unknown,send:PushSender){
  if(typeof deviceId!=="string")throw new NotificationError("DEVICE_REQUIRED");
  const userProfileId=await profileIdForAuth(authUserId);
  const subscription=await db.pushSubscription.findFirst({where:{userProfileId,deviceId,revokedAt:null,vapidKeyVersion:vapidKeyVersion()}});
  if(!subscription)throw new NotificationError("DEVICE_NOT_SUBSCRIBED",404);
  await send(subscription,JSON.stringify({title:"Canastio",body:"Las notificaciones funcionan en este dispositivo.",destination:"/app/perfil/notificaciones",tag:"PUSH_TEST"}));
  return {accepted:true};
}

export async function dispatchNotification(event: PushEvent, send: PushSender, clock: Clock = systemClock) {
  if (!isNotificationIntent(event.intent) || !event.eventKey || event.eventKey.length > 191 || !event.title || event.title.length > 100 || !event.body || event.body.length > 240) throw new NotificationError("INVALID_EVENT");
  if (event.leagueId) { const membership = await db.leagueMembership.findFirst({ where: { userProfileId: event.userProfileId, leagueId: event.leagueId, status: "ACTIVE", league: { status: "ACTIVE" } }, select: { id: true } }); if (!membership) return { delivered: 0, skipped: true }; }
  const preference = await db.notificationPreference.findUnique({ where: { userProfileId_intent: { userProfileId: event.userProfileId, intent: event.intent } } });
  if (!preference?.enabled) return { delivered: 0, skipped: true };
  const subscriptions = await db.pushSubscription.findMany({ where: { userProfileId: event.userProfileId, revokedAt: null, vapidKeyVersion: vapidKeyVersion() } });
  let delivered = 0;
  for (const subscription of subscriptions) {
    const now = clock(), claimToken = randomUUID(); let deliveryId: string | null = null;
    try { deliveryId = (await db.notificationDelivery.create({ data: { userProfileId: event.userProfileId, pushSubscriptionId: subscription.id, intent: event.intent, eventKey: event.eventKey, status: "PENDING", nextAttemptAt: now, claimedAt: now, claimToken }, select: { id: true } })).id; }
    catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
      const leaseExpired = new Date(now.getTime() - PUSH_CLAIM_LEASE_MS);
      const existing = await db.notificationDelivery.findUnique({ where: { pushSubscriptionId_intent_eventKey: { pushSubscriptionId: subscription.id, intent: event.intent, eventKey: event.eventKey } }, select: { id: true, status: true, attemptCount: true, nextAttemptAt: true, claimedAt: true } });
      if (!existing || existing.status === "DELIVERED" || existing.attemptCount >= PUSH_MAX_ATTEMPTS || existing.nextAttemptAt > now || (existing.claimedAt && existing.claimedAt > leaseExpired)) continue;
      const claimed = await db.notificationDelivery.updateMany({ where: { id: existing.id, status: { in: ["PENDING", "RETRYABLE"] }, attemptCount: { lt: PUSH_MAX_ATTEMPTS }, nextAttemptAt: { lte: now }, OR: [{ claimedAt: null }, { claimedAt: { lte: leaseExpired } }] }, data: { status: "PENDING", claimedAt: now, claimToken } });
      if (!claimed.count) continue; deliveryId = existing.id;
    }
    const [freshSubscription, freshPreference] = await Promise.all([
      db.pushSubscription.findFirst({ where: { id: subscription.id, userProfileId: event.userProfileId, revokedAt: null, vapidKeyVersion: vapidKeyVersion() } }),
      db.notificationPreference.findUnique({ where: { userProfileId_intent: { userProfileId: event.userProfileId, intent: event.intent } } }),
    ]);
    if (!freshSubscription || !freshPreference?.enabled) { await db.notificationDelivery.updateMany({ where: { id: deliveryId, claimToken }, data: { status: "CANCELLED", claimToken: null, claimedAt: null, lastErrorCode: "NO_LONGER_ELIGIBLE" } }); continue; }
    const payload = JSON.stringify({ title: event.title, body: event.body, destination: safeNotificationDestination(event.destination), tag: `${event.intent}:${event.eventKey}` });
    try {
      await send(freshSubscription, payload);
      const updated = await db.notificationDelivery.updateMany({ where: { id: deliveryId, claimToken, status: "PENDING" }, data: { status: "DELIVERED", deliveredAt: now, lastAttemptAt: now, attemptCount: { increment: 1 }, claimToken: null, claimedAt: null, lastErrorCode: null } });
      if (updated.count) delivered++;
    } catch (caught) {
      const error = caught as PushFailure, status = Number(error.statusCode) || 0;
      if (status === 404 || status === 410) await db.pushSubscription.updateMany({ where: { id: subscription.id, userProfileId: event.userProfileId }, data: { revokedAt: now, revokedReason:"EXPIRED" } });
      const current = await db.notificationDelivery.findUnique({ where: { id: deliveryId }, select: { attemptCount: true } });
      const attempts = (current?.attemptCount ?? 0) + 1, terminal = permanentStatus(status) || attempts >= PUSH_MAX_ATTEMPTS;
      await db.notificationDelivery.updateMany({ where: { id: deliveryId, claimToken }, data: { status: status === 404 || status === 410 ? "EXPIRED" : terminal ? "FAILED" : "RETRYABLE", attemptCount: { increment: 1 }, lastAttemptAt: now, nextAttemptAt: new Date(now.getTime() + pushRetryDelay(attempts, status === 429 ? retryAfter(error) : null)), claimedAt: null, claimToken: null, lastErrorCode: sanitizedPushError(status) } });
    }
  }
  return { delivered, skipped: false };
}
