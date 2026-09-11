CREATE TABLE "sports_data_revisions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "target_type" VARCHAR(32) NOT NULL,
  "target_id" UUID NOT NULL, "game_id" UUID, "player_game_stat_id" UUID,
  "source_type" VARCHAR(32) NOT NULL, "status" VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
  "field_name" VARCHAR(64) NOT NULL, "before_snapshot" JSONB NOT NULL, "after_snapshot" JSONB NOT NULL,
  "expected_fingerprint" CHAR(64) NOT NULL, "idempotency_key" VARCHAR(191) NOT NULL UNIQUE,
  "internal_reason" VARCHAR(500) NOT NULL, "public_reason" VARCHAR(240), "impact" JSONB NOT NULL,
  "recomputation_status" VARCHAR(32) NOT NULL DEFAULT 'PENDING', "recomputation_error" VARCHAR(64),
  "actor_profile_id" UUID NOT NULL REFERENCES "user_profiles"("id") ON DELETE RESTRICT,
  "reverts_revision_id" UUID REFERENCES "sports_data_revisions"("id") ON DELETE RESTRICT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "applied_at" TIMESTAMPTZ(3),
  CONSTRAINT "sports_data_revisions_target" CHECK (("target_type"='GAME' AND "game_id"="target_id" AND "player_game_stat_id" IS NULL) OR ("target_type"='PLAYER_GAME_STAT' AND "player_game_stat_id"="target_id" AND "game_id" IS NULL)),
  CONSTRAINT "sports_data_revisions_source" CHECK ("source_type" IN ('SOURCE_CORRECTION','MANUAL_OVERRIDE')),
  CONSTRAINT "sports_data_revisions_status" CHECK ("status" IN ('PROPOSED','APPLIED','FAILED','SUPERSEDED'))
);
CREATE INDEX "sports_data_revisions_target_created_idx" ON "sports_data_revisions"("target_type","target_id","created_at" DESC);
CREATE INDEX "sports_data_revisions_status_recompute_idx" ON "sports_data_revisions"("status","recomputation_status","created_at");
