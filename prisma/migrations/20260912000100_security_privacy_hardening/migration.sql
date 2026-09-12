ALTER TABLE "user_profiles"
  ADD COLUMN "discoverable_by_username" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3);

CREATE INDEX "user_profiles_discoverable_username_idx"
  ON "user_profiles" ("username")
  WHERE "discoverable_by_username" = true AND "deleted_at" IS NULL;
