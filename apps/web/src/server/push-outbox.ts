import { Prisma } from "@prisma/client";
import { isNotificationIntent, safeNotificationDestination, type PushOutboxPayload } from "../../../../packages/domain/notifications";

type OutboxTx = Pick<Prisma.TransactionClient, "$executeRaw">;
export type OutboxEvent = PushOutboxPayload & { eventKey: string };

export function validateOutboxEvent(event: OutboxEvent) {
  if (!event.eventKey || event.eventKey.length > 191 || !isNotificationIntent(event.intent)) throw new Error("INVALID_OUTBOX_EVENT");
  if (!event.userProfileId || !event.title || event.title.length > 100 || !event.body || event.body.length > 240) throw new Error("INVALID_OUTBOX_EVENT");
  return { userProfileId: event.userProfileId, ...(event.leagueId ? { leagueId: event.leagueId } : {}), intent: event.intent,
    title: event.title, body: event.body, destination: safeNotificationDestination(event.destination) } satisfies PushOutboxPayload;
}

export async function enqueuePushEvent(tx: OutboxTx, event: OutboxEvent) {
  const payload = validateOutboxEvent(event);
  return tx.$executeRaw(Prisma.sql`INSERT INTO push_outbox_events (id,user_profile_id,event_key,payload,status,next_attempt_at,created_at,updated_at)
    VALUES (gen_random_uuid(),${event.userProfileId}::uuid,${event.eventKey},${JSON.stringify(payload)}::jsonb,'PENDING',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT (event_key) DO NOTHING`);
}

export async function wakePushWorker(fetcher: typeof fetch = fetch) {
  const url = process.env.CANASTIO_PUSH_WAKE_URL?.trim(), secret = process.env.CANASTIO_PUSH_WAKE_SECRET?.trim();
  if (!url || !secret) return false;
  try { const response = await fetcher(url, { method: "POST", headers: { authorization: `Bearer ${secret}` }, cache: "no-store" }); return response.ok; }
  catch { return false; }
}
