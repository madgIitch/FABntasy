ALTER TABLE "push_subscriptions"
  ADD COLUMN "vapid_key_version" VARCHAR(32),
  ADD COLUMN "device_id" UUID,
  ADD COLUMN "revoked_reason" VARCHAR(24);

ALTER TABLE "notification_deliveries"
  ADD COLUMN "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "claimed_at" TIMESTAMPTZ(3),
  ADD COLUMN "claim_token" UUID,
  ADD COLUMN "last_attempt_at" TIMESTAMPTZ(3);

CREATE INDEX "notification_deliveries_status_next_attempt_claimed_idx"
  ON "notification_deliveries"("status", "next_attempt_at", "claimed_at");

ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_deliveries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_owner_all" ON "push_subscriptions" FOR ALL
  USING (EXISTS (SELECT 1 FROM "user_profiles" p WHERE p.id = user_profile_id AND p.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "user_profiles" p WHERE p.id = user_profile_id AND p.auth_user_id = auth.uid()));
CREATE POLICY "notification_preferences_owner_all" ON "notification_preferences" FOR ALL
  USING (EXISTS (SELECT 1 FROM "user_profiles" p WHERE p.id = user_profile_id AND p.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "user_profiles" p WHERE p.id = user_profile_id AND p.auth_user_id = auth.uid()));
CREATE POLICY "notification_deliveries_owner_all" ON "notification_deliveries" FOR ALL
  USING (EXISTS (SELECT 1 FROM "user_profiles" p WHERE p.id = user_profile_id AND p.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "user_profiles" p WHERE p.id = user_profile_id AND p.auth_user_id = auth.uid()));
