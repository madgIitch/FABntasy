-- Additive, provider-independent feedback storage. Technical telemetry remains ephemeral.
CREATE TABLE "user_feedback" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_profile_id" UUID NOT NULL,
  "category" VARCHAR(32) NOT NULL,
  "text" VARCHAR(1000) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'NEW',
  "technical_context" JSONB,
  "technical_context_consent" BOOLEAN NOT NULL DEFAULT false,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_feedback_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_feedback_user_profile_id_idempotency_key_key" ON "user_feedback"("user_profile_id", "idempotency_key");
CREATE INDEX "user_feedback_status_created_at_idx" ON "user_feedback"("status", "created_at");
