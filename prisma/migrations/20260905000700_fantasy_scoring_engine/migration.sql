CREATE TABLE "fantasy_scoring_rule_sets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "competition_season_id" UUID NOT NULL,
  "identifier" TEXT NOT NULL, "version" TEXT NOT NULL, "calculation_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "definition" JSONB NOT NULL, "published_at" TIMESTAMPTZ, "retired_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fantasy_scoring_rule_sets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fantasy_scoring_rule_sets_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_scoring_rule_sets_identity_key" UNIQUE ("competition_season_id", "calculation_type", "identifier", "version"),
  CONSTRAINT "fantasy_scoring_rule_sets_status_check" CHECK ("status" IN ('DRAFT','ACTIVE','INACTIVE','RETIRED')),
  CONSTRAINT "fantasy_scoring_rule_sets_publication_check" CHECK ("status" = 'DRAFT' OR "published_at" IS NOT NULL)
);
CREATE UNIQUE INDEX "fantasy_scoring_rule_sets_one_active" ON "fantasy_scoring_rule_sets" ("competition_season_id", "calculation_type") WHERE "status" = 'ACTIVE';
CREATE INDEX "fantasy_scoring_rule_sets_lookup" ON "fantasy_scoring_rule_sets" ("competition_season_id", "calculation_type", "status");

CREATE TABLE "fantasy_player_game_scores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "player_game_stat_id" UUID NOT NULL, "player_id" UUID NOT NULL, "game_id" UUID NOT NULL,
  "rule_set_id" UUID NOT NULL, "rule_set_version" TEXT NOT NULL, "source_stats_version" CHAR(64) NOT NULL,
  "raw_score" DECIMAL(18,6), "normalized_fantasy_points" DECIMAL(18,6), "status" TEXT NOT NULL, "error_code" TEXT, "breakdown" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fantasy_player_game_scores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fantasy_player_game_scores_inputs_key" UNIQUE ("player_game_stat_id", "rule_set_id", "source_stats_version"),
  CONSTRAINT "fantasy_player_game_scores_source_hash_check" CHECK ("source_stats_version" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "fantasy_player_game_scores_status_check" CHECK ("status" IN ('CALCULATED','DNP','PENDING','NOT_CALCULABLE','ERROR')),
  CONSTRAINT "fantasy_player_game_scores_score_state_check" CHECK (("status" IN ('CALCULATED','DNP') AND "normalized_fantasy_points" IS NOT NULL AND "error_code" IS NULL) OR ("status" NOT IN ('CALCULATED','DNP') AND "normalized_fantasy_points" IS NULL)),
  CONSTRAINT "fantasy_player_game_scores_stat_fkey" FOREIGN KEY ("player_game_stat_id") REFERENCES "player_game_stats"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_player_game_scores_player_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_player_game_scores_game_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_player_game_scores_rule_set_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "fantasy_scoring_rule_sets"("id") ON DELETE RESTRICT
);
CREATE INDEX "fantasy_player_game_scores_lookup" ON "fantasy_player_game_scores" ("player_id", "game_id", "rule_set_id");

CREATE TABLE "fantasy_rule_set_activations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "competition_season_id" UUID NOT NULL, "rule_set_id" UUID NOT NULL,
  "action" TEXT NOT NULL, "actor" TEXT NOT NULL, "reason" TEXT NOT NULL, "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fantasy_rule_set_activations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fantasy_rule_set_activations_action_check" CHECK ("action" IN ('ACTIVATED','REACTIVATED','RETIRED')),
  CONSTRAINT "fantasy_rule_set_activations_season_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_rule_set_activations_rule_set_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "fantasy_scoring_rule_sets"("id") ON DELETE RESTRICT
);
CREATE INDEX "fantasy_rule_set_activations_audit" ON "fantasy_rule_set_activations" ("competition_season_id", "occurred_at");

CREATE FUNCTION prevent_published_ruleset_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."published_at" IS NOT NULL AND (NEW."identifier", NEW."version", NEW."calculation_type", NEW."definition") IS DISTINCT FROM (OLD."identifier", OLD."version", OLD."calculation_type", OLD."definition") THEN
    RAISE EXCEPTION 'published fantasy rulesets are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fantasy_ruleset_immutable" BEFORE UPDATE ON "fantasy_scoring_rule_sets" FOR EACH ROW EXECUTE FUNCTION prevent_published_ruleset_mutation();
CREATE FUNCTION prevent_published_ruleset_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."published_at" IS NOT NULL THEN RAISE EXCEPTION 'published fantasy rulesets cannot be deleted; retire them'; END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER "fantasy_ruleset_no_delete" BEFORE DELETE ON "fantasy_scoring_rule_sets" FOR EACH ROW EXECUTE FUNCTION prevent_published_ruleset_delete();
