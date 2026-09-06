CREATE TABLE "fantasy_round_scores" (
  "id" UUID NOT NULL,
  "fantasy_team_id" UUID NOT NULL,
  "league_id" UUID NOT NULL,
  "competition_season_id" UUID NOT NULL,
  "round_number" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL,
  "lineup_id" UUID NOT NULL,
  "rule_set_id" UUID NOT NULL,
  "input_revision" CHAR(64) NOT NULL,
  "status" TEXT NOT NULL,
  "points" DECIMAL(18,6),
  "breakdown" JSONB NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  "superseded_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fantasy_round_scores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fantasy_round_scores_status_check" CHECK ("status" IN ('PROVISIONAL','PUBLISHED')),
  CONSTRAINT "fantasy_round_scores_publication_check" CHECK (("status"='PROVISIONAL' AND "points" IS NULL AND "published_at" IS NULL) OR ("status"='PUBLISHED' AND "points" IS NOT NULL AND "published_at" IS NOT NULL)),
  CONSTRAINT "fantasy_round_scores_team_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_round_scores_league_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_round_scores_season_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_round_scores_lineup_fkey" FOREIGN KEY ("lineup_id") REFERENCES "fantasy_lineups"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_round_scores_ruleset_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "fantasy_scoring_rule_sets"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "fantasy_round_scores_team_round_revision_key" ON "fantasy_round_scores"("fantasy_team_id","round_number","revision");
CREATE UNIQUE INDEX "fantasy_round_scores_team_round_input_key" ON "fantasy_round_scores"("fantasy_team_id","round_number","input_revision");
CREATE INDEX "fantasy_round_scores_global_idx" ON "fantasy_round_scores"("competition_season_id","round_number","status","superseded_at");
CREATE INDEX "fantasy_round_scores_league_idx" ON "fantasy_round_scores"("league_id","round_number","status","superseded_at");

CREATE TABLE "fantasy_team_totals" (
  "id" UUID NOT NULL,
  "fantasy_team_id" UUID NOT NULL,
  "league_id" UUID NOT NULL,
  "competition_season_id" UUID NOT NULL,
  "total_points" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "last_round_number" INTEGER,
  "last_round_points" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "best_round_points" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "global_position" INTEGER,
  "previous_global_position" INTEGER,
  "league_position" INTEGER,
  "previous_league_position" INTEGER,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "fantasy_team_totals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fantasy_team_totals_team_key" UNIQUE ("fantasy_team_id"),
  CONSTRAINT "fantasy_team_totals_team_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_team_totals_league_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT,
  CONSTRAINT "fantasy_team_totals_season_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT
);
CREATE INDEX "fantasy_team_totals_global_idx" ON "fantasy_team_totals"("competition_season_id","global_position");
CREATE INDEX "fantasy_team_totals_league_idx" ON "fantasy_team_totals"("league_id","league_position");
