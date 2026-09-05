-- Additive Sprint 10 fantasy roster storage. Historical snapshots are never cascaded.
CREATE TABLE "fantasy_roster_rule_sets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "competition_season_id" UUID NOT NULL,
  "identifier" TEXT NOT NULL, "version" TEXT NOT NULL, "budget_credits" BIGINT NOT NULL,
  "roster_size" INTEGER NOT NULL, "starter_count" INTEGER NOT NULL, "substitute_count" INTEGER NOT NULL,
  "max_per_real_team" INTEGER NOT NULL, "position_limits" JSONB NOT NULL DEFAULT '{}',
  "cold_start_price_credits" BIGINT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fantasy_roster_rule_sets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fantasy_roster_rule_sets_values_check" CHECK (budget_credits >= 0 AND roster_size > 0 AND starter_count >= 0 AND substitute_count >= 0 AND starter_count + substitute_count = roster_size AND max_per_real_team > 0 AND cold_start_price_credits >= 0),
  CONSTRAINT "fantasy_roster_rule_sets_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "fantasy_roster_rule_sets_competition_season_id_identifier_version_key" ON "fantasy_roster_rule_sets"("competition_season_id", "identifier", "version");
CREATE UNIQUE INDEX "fantasy_roster_rule_sets_id_competition_season_id_key" ON "fantasy_roster_rule_sets"("id", "competition_season_id");
CREATE INDEX "fantasy_roster_rule_sets_competition_season_id_status_idx" ON "fantasy_roster_rule_sets"("competition_season_id", "status");
CREATE UNIQUE INDEX "fantasy_roster_rule_sets_one_active" ON "fantasy_roster_rule_sets"("competition_season_id") WHERE status = 'ACTIVE';

CREATE TABLE "fantasy_teams" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_profile_id" UUID NOT NULL, "competition_season_id" UUID NOT NULL,
  "roster_rule_set_id" UUID NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fantasy_teams_pkey" PRIMARY KEY ("id"), CONSTRAINT "fantasy_teams_version_check" CHECK (version > 0),
  CONSTRAINT "fantasy_teams_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_teams_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_teams_roster_rule_set_id_fkey" FOREIGN KEY ("roster_rule_set_id") REFERENCES "fantasy_roster_rule_sets"("id") ON DELETE RESTRICT
);
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_rules_same_season_fkey" FOREIGN KEY ("roster_rule_set_id", "competition_season_id") REFERENCES "fantasy_roster_rule_sets"("id", "competition_season_id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "fantasy_teams_user_profile_id_competition_season_id_key" ON "fantasy_teams"("user_profile_id", "competition_season_id");

CREATE TABLE "fantasy_roster_slots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "fantasy_team_id" UUID NOT NULL, "player_registration_id" UUID NOT NULL,
  "acquisition_price" BIGINT NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fantasy_roster_slots_pkey" PRIMARY KEY ("id"), CONSTRAINT "fantasy_roster_slots_price_check" CHECK (acquisition_price >= 0),
  CONSTRAINT "fantasy_roster_slots_fantasy_team_id_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "fantasy_teams"("id") ON DELETE CASCADE,
  CONSTRAINT "fantasy_roster_slots_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "fantasy_roster_slots_fantasy_team_id_player_registration_id_key" ON "fantasy_roster_slots"("fantasy_team_id", "player_registration_id");

CREATE TABLE "fantasy_lineups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "fantasy_team_id" UUID NOT NULL, "round_number" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "cutoff_at" TIMESTAMPTZ(3) NOT NULL,
  "locked_at" TIMESTAMPTZ(3), "superseded_at" TIMESTAMPTZ(3), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fantasy_lineups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fantasy_lineups_values_check" CHECK (round_number > 0 AND revision > 0 AND status IN ('DRAFT','LOCKED') AND ((status = 'DRAFT' AND locked_at IS NULL) OR (status = 'LOCKED' AND locked_at IS NOT NULL))),
  CONSTRAINT "fantasy_lineups_fantasy_team_id_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "fantasy_lineups_fantasy_team_id_round_number_revision_key" ON "fantasy_lineups"("fantasy_team_id", "round_number", "revision");
CREATE UNIQUE INDEX "fantasy_lineups_one_current_revision" ON "fantasy_lineups"("fantasy_team_id", "round_number") WHERE superseded_at IS NULL;
CREATE INDEX "fantasy_lineups_fantasy_team_id_round_number_superseded_at_idx" ON "fantasy_lineups"("fantasy_team_id", "round_number", "superseded_at");

CREATE TABLE "fantasy_lineup_slots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "fantasy_lineup_id" UUID NOT NULL, "player_registration_id" UUID NOT NULL,
  "role" TEXT NOT NULL, "ordinal" INTEGER NOT NULL, "player_id_snapshot" UUID NOT NULL, "display_name_snapshot" TEXT NOT NULL,
  "real_team_id_snapshot" UUID NOT NULL, "real_team_name_snapshot" TEXT NOT NULL, "acquisition_price" BIGINT NOT NULL,
  "market_price_snapshot" BIGINT,
  CONSTRAINT "fantasy_lineup_slots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fantasy_lineup_slots_values_check" CHECK (role IN ('STARTER','SUBSTITUTE') AND ordinal >= 0 AND acquisition_price >= 0 AND (market_price_snapshot IS NULL OR market_price_snapshot >= 0)),
  CONSTRAINT "fantasy_lineup_slots_fantasy_lineup_id_fkey" FOREIGN KEY ("fantasy_lineup_id") REFERENCES "fantasy_lineups"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_lineup_slots_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "fantasy_lineup_slots_fantasy_lineup_id_player_registration_id_key" ON "fantasy_lineup_slots"("fantasy_lineup_id", "player_registration_id");
CREATE UNIQUE INDEX "fantasy_lineup_slots_fantasy_lineup_id_role_ordinal_key" ON "fantasy_lineup_slots"("fantasy_lineup_id", "role", "ordinal");

-- Once created, snapshot contents cannot be rewritten or removed.
CREATE FUNCTION prevent_fantasy_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'fantasy lineup snapshots are immutable' USING ERRCODE = '55000'; END $$;
CREATE TRIGGER fantasy_lineup_slots_immutable BEFORE UPDATE OR DELETE ON "fantasy_lineup_slots" FOR EACH ROW EXECUTE FUNCTION prevent_fantasy_snapshot_mutation();
