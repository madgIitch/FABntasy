ALTER TABLE "user_profiles"
  ADD COLUMN "active_league_id" UUID;

CREATE INDEX "user_profiles_active_league_id_idx"
  ON "user_profiles" ("active_league_id");

COMMENT ON COLUMN "user_profiles"."active_league_id" IS
  'Preferred active fantasy league; application validates an ACTIVE membership and falls back deterministically.';
