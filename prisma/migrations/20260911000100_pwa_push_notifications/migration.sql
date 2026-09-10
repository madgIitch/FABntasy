CREATE TABLE "push_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_profile_id" UUID NOT NULL,
  "endpoint" TEXT NOT NULL, "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL,
  "user_agent" VARCHAR(512), "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(3), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_user_profile_id_revoked_at_idx" ON "push_subscriptions"("user_profile_id", "revoked_at");
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_profile_id" UUID NOT NULL,
  "intent" VARCHAR(32) NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_preferences_user_profile_id_intent_key" ON "notification_preferences"("user_profile_id", "intent");
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notification_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_profile_id" UUID NOT NULL, "push_subscription_id" UUID NOT NULL,
  "intent" VARCHAR(32) NOT NULL, "event_key" VARCHAR(191) NOT NULL, "status" VARCHAR(24) NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0, "last_error_code" VARCHAR(64), "delivered_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_deliveries_subscription_intent_event_key" ON "notification_deliveries"("push_subscription_id", "intent", "event_key");
CREATE INDEX "notification_deliveries_user_status_created_idx" ON "notification_deliveries"("user_profile_id", "status", "created_at");
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_push_subscription_id_fkey" FOREIGN KEY ("push_subscription_id") REFERENCES "push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
