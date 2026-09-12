-- Additive covering/partial indexes for Sprint 20 read and publication paths.
CREATE INDEX IF NOT EXISTS "fantasy_round_scores_current_team_round_idx"
  ON "fantasy_round_scores" ("fantasy_team_id", "round_number", "revision" DESC)
  WHERE "superseded_at" IS NULL;
CREATE INDEX IF NOT EXISTS "fantasy_round_scores_current_season_status_idx"
  ON "fantasy_round_scores" ("competition_season_id", "status", "round_number", "fantasy_team_id")
  INCLUDE ("points", "published_at", "revision") WHERE "superseded_at" IS NULL;
CREATE INDEX IF NOT EXISTS "market_transactions_league_recent_idx"
  ON "market_transactions" ("league_id", "created_at" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "fantasy_roster_slots_league_team_idx"
  ON "fantasy_roster_slots" ("league_id", "fantasy_team_id", "player_registration_id");
