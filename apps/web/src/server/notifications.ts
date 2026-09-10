import { isNotificationIntent, NOTIFICATION_INTENTS, safeNotificationDestination, type NotificationIntent } from "../../../../packages/domain/notifications";
import { db } from "./db";

export class NotificationError extends Error { constructor(public code: string, public status = 400) { super(code); } }

export async function profileIdForAuth(authUserId: string) {
  const profile = await db.userProfile.findUnique({ where: { authUserId }, select: { id: true } });
  if (!profile) throw new NotificationError("PROFILE_NOT_FOUND", 404);
  return profile.id;
}

export function parseSubscription(input: unknown) {
  const value = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (!value || typeof value.endpoint !== "string" || value.endpoint.length > 4096 || !value.endpoint.startsWith("https://")) throw new NotificationError("INVALID_SUBSCRIPTION");
  const p256dh = value.keys?.p256dh, auth = value.keys?.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 512 || auth.length > 512) throw new NotificationError("INVALID_SUBSCRIPTION");
  return { endpoint: value.endpoint, p256dh, auth };
}

export async function notificationSettings(authUserId: string) {
  const userProfileId = await profileIdForAuth(authUserId);
  const [preferences, subscriptions] = await Promise.all([
    db.notificationPreference.findMany({ where: { userProfileId } }),
    db.pushSubscription.findMany({ where: { userProfileId, revokedAt: null }, select: { id: true, endpoint: true, lastSeenAt: true } }),
  ]);
  const enabled = new Map(preferences.map((item) => [item.intent, item.enabled]));
  return { preferences: Object.fromEntries(NOTIFICATION_INTENTS.map((intent) => [intent, enabled.get(intent) ?? false])), subscriptions };
}

export async function saveSubscription(authUserId: string, input: unknown, userAgent?: string | null) {
  const userProfileId = await profileIdForAuth(authUserId), subscription = parseSubscription(input);
  const existing = await db.pushSubscription.findUnique({ where: { endpoint: subscription.endpoint }, select: { userProfileId: true } });
  if (existing && existing.userProfileId !== userProfileId) throw new NotificationError("SUBSCRIPTION_OWNED_BY_ANOTHER_USER", 409);
  return db.pushSubscription.upsert({ where: { endpoint: subscription.endpoint }, create: { ...subscription, userProfileId, userAgent: userAgent?.slice(0, 512) }, update: { ...subscription, userAgent: userAgent?.slice(0, 512), revokedAt: null, lastSeenAt: new Date() }, select: { id: true, endpoint: true, lastSeenAt: true } });
}

export async function revokeSubscription(authUserId: string, endpoint?: unknown) {
  const userProfileId = await profileIdForAuth(authUserId);
  return db.pushSubscription.updateMany({ where: { userProfileId, revokedAt: null, ...(typeof endpoint === "string" ? { endpoint } : {}) }, data: { revokedAt: new Date() } });
}

export async function setPreference(authUserId: string, intentValue: unknown, enabled: unknown) {
  if (!isNotificationIntent(intentValue) || typeof enabled !== "boolean") throw new NotificationError("INVALID_PREFERENCE");
  const userProfileId = await profileIdForAuth(authUserId);
  return db.notificationPreference.upsert({ where: { userProfileId_intent: { userProfileId, intent: intentValue } }, create: { userProfileId, intent: intentValue, enabled }, update: { enabled }, select: { intent: true, enabled: true } });
}

export type PushEvent = { userProfileId: string; leagueId?: string; intent: NotificationIntent; eventKey: string; title: string; body: string; destination?: string };
export type PushSender = (subscription: { endpoint: string; p256dh: string; auth: string }, payload: string) => Promise<void>;

export async function dispatchNotification(event: PushEvent, send: PushSender) {
  if (!isNotificationIntent(event.intent) || !event.eventKey || event.title.length > 100 || event.body.length > 240) throw new NotificationError("INVALID_EVENT");
  if (event.leagueId) {
    const membership = await db.leagueMembership.findFirst({ where: { userProfileId: event.userProfileId, leagueId: event.leagueId, status: "ACTIVE", league: { status: "ACTIVE" } }, select: { id: true } });
    if (!membership) return { delivered: 0, skipped: true };
  }
  const preference = await db.notificationPreference.findUnique({ where: { userProfileId_intent: { userProfileId: event.userProfileId, intent: event.intent } } });
  if (!preference?.enabled) return { delivered: 0, skipped: true };
  const subscriptions = await db.pushSubscription.findMany({ where: { userProfileId: event.userProfileId, revokedAt: null } });
  let delivered = 0;
  for (const subscription of subscriptions) {
    let delivery: { id: string; status: string; attemptCount: number };
    try { delivery = await db.notificationDelivery.create({ data: { userProfileId: event.userProfileId, pushSubscriptionId: subscription.id, intent: event.intent, eventKey: event.eventKey, status: "PENDING" }, select: { id: true, status: true, attemptCount: true } }); }
    catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
      const existing = await db.notificationDelivery.findUnique({ where: { pushSubscriptionId_intent_eventKey: { pushSubscriptionId: subscription.id, intent: event.intent, eventKey: event.eventKey } }, select: { id: true, status: true, attemptCount: true } });
      if (!existing || existing.status !== "RETRYABLE" || existing.attemptCount >= 3) continue;
      const claimed = await db.notificationDelivery.updateMany({ where: { id: existing.id, status: "RETRYABLE" }, data: { status: "PENDING" } });
      if (!claimed.count) continue;
      delivery = { ...existing, status: "PENDING" };
    }
    try {
      await send(subscription, JSON.stringify({ title: event.title, body: event.body, destination: safeNotificationDestination(event.destination), tag: `${event.intent}:${event.eventKey}` }));
      await db.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "DELIVERED", deliveredAt: new Date(), attemptCount: { increment: 1 }, lastErrorCode: null } }); delivered++;
    } catch (error) {
      const status = Number((error as { statusCode?: number }).statusCode);
      if (status === 404 || status === 410) await db.pushSubscription.update({ where: { id: subscription.id }, data: { revokedAt: new Date() } });
      await db.notificationDelivery.update({ where: { id: delivery.id }, data: { status: status === 404 || status === 410 ? "EXPIRED" : "RETRYABLE", attemptCount: { increment: 1 }, lastErrorCode: status ? `HTTP_${status}` : "SEND_FAILED" } });
    }
  }
  return { delivered, skipped: false };
}
