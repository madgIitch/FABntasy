import webpush from "web-push";
import type { PushSender } from "./notifications";

let configured = false;
export type VapidConfiguration = { publicKey: string; privateKey: string; subject: string; keyVersion: string };
export function validateVapidConfiguration(env: NodeJS.ProcessEnv = process.env): VapidConfiguration {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim(), privateKey = env.VAPID_PRIVATE_KEY?.trim(), subject = env.VAPID_SUBJECT?.trim(), keyVersion = env.VAPID_KEY_VERSION?.trim() || "v1";
  if (!publicKey || !/^[A-Za-z0-9_-]{80,100}$/.test(publicKey)) throw new Error("VAPID_PUBLIC_KEY_INVALID");
  if (!privateKey || !/^[A-Za-z0-9_-]{40,60}$/.test(privateKey)) throw new Error("VAPID_PRIVATE_KEY_INVALID");
  if (!subject || (!subject.startsWith("mailto:") && !subject.startsWith("https://"))) throw new Error("VAPID_SUBJECT_INVALID");
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(keyVersion)) throw new Error("VAPID_KEY_VERSION_INVALID");
  return { publicKey, privateKey, subject, keyVersion };
}
export function createWebPushSender(): PushSender {
  const { publicKey, privateKey, subject } = validateVapidConfiguration();
  if (!configured) { webpush.setVapidDetails(subject, publicKey, privateKey); configured = true; }
  return async (subscription, payload) => {
    if (Buffer.byteLength(payload, "utf8") > 3584) throw new Error("PUSH_PAYLOAD_TOO_LARGE");
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 300, timeout: 10_000 });
  };
}
