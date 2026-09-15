CREATE TABLE "push_outbox_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_profile_id" UUID NOT NULL,
  "event_key" VARCHAR(191) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimed_at" TIMESTAMPTZ(3),
  "last_error_code" VARCHAR(64),
  "delivered_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "push_outbox_events_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "push_outbox_events_attempt_count_check" CHECK ("attempt_count" BETWEEN 0 AND 3),
  CONSTRAINT "push_outbox_events_status_check" CHECK ("status" IN ('PENDING','PROCESSING','RETRYABLE','DELIVERED','FAILED')),
  CONSTRAINT "push_outbox_events_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);
CREATE UNIQUE INDEX "push_outbox_events_event_key_key" ON "push_outbox_events"("event_key");
CREATE INDEX "push_outbox_events_status_next_attempt_at_claimed_at_idx" ON "push_outbox_events"("status", "next_attempt_at", "claimed_at");
