CREATE TABLE "rollout_settings" (
  "id" VARCHAR(32) NOT NULL DEFAULT 'global',
  "state" VARCHAR(16) NOT NULL DEFAULT 'PREVIEW',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_profile_id" UUID,
  CONSTRAINT "rollout_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rollout_settings_state_check" CHECK ("state" IN ('PREVIEW', 'OPEN')),
  CONSTRAINT "rollout_settings_singleton_check" CHECK ("id" = 'global'),
  CONSTRAINT "rollout_settings_updated_by_profile_id_fkey" FOREIGN KEY ("updated_by_profile_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "rollout_settings" ("id", "state", "version") VALUES ('global', 'PREVIEW', 1);
