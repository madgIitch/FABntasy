import webpush from "web-push";
import type { PushSender } from "./notifications";

let configured = false;
export function createWebPushSender(): PushSender {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("WEB_PUSH_NOT_CONFIGURED");
  if (!configured) { webpush.setVapidDetails(subject, publicKey, privateKey); configured = true; }
  return async (subscription, payload) => {
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 300 });
  };
}
