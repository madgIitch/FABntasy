CREATE TABLE "player_prices" (
  "id" UUID NOT NULL,
  "player_registration_id" UUID NOT NULL,
  "competition_season_id" UUID NOT NULL,
  "algorithm_version" TEXT NOT NULL,
  "current_price" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROVISIONAL',
  "last_round_number" INTEGER,
  "all_time_high" BIGINT NOT NULL,
  "all_time_low" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "player_prices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_prices_non_negative" CHECK ("current_price" >= 0 AND "all_time_high" >= 0 AND "all_time_low" >= 0)
);

CREATE TABLE "player_price_events" (
  "id" UUID NOT NULL,
  "player_price_id" UUID NOT NULL,
  "player_registration_id" UUID NOT NULL,
  "competition_season_id" UUID NOT NULL,
  "round_number" INTEGER NOT NULL,
  "algorithm_version" TEXT NOT NULL,
  "input_revision" CHAR(64) NOT NULL,
  "status" TEXT NOT NULL,
  "previous_price" BIGINT NOT NULL,
  "target_price" BIGINT,
  "new_price" BIGINT NOT NULL,
  "recent_form" DECIMAL(18,6),
  "season_average" DECIMAL(18,6),
  "market_rating" DECIMAL(18,6),
  "percentile" DECIMAL(9,6),
  "dnp_streak" INTEGER NOT NULL DEFAULT 0,
  "input_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "player_price_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_price_events_prices_non_negative" CHECK ("previous_price" >= 0 AND "new_price" >= 0 AND ("target_price" IS NULL OR "target_price" >= 0)),
  CONSTRAINT "player_price_events_dnp_streak_non_negative" CHECK ("dnp_streak" >= 0)
);

CREATE UNIQUE INDEX "player_prices_player_registration_id_competition_season_id_algorithm_version_key" ON "player_prices"("player_registration_id", "competition_season_id", "algorithm_version");
CREATE INDEX "player_prices_competition_season_id_algorithm_version_current_price_idx" ON "player_prices"("competition_season_id", "algorithm_version", "current_price");
CREATE UNIQUE INDEX "player_price_events_player_price_id_round_number_algorithm_version_input_revision_key" ON "player_price_events"("player_price_id", "round_number", "algorithm_version", "input_revision");
CREATE INDEX "player_price_events_competition_season_id_round_number_algorithm_version_idx" ON "player_price_events"("competition_season_id", "round_number", "algorithm_version");
CREATE INDEX "player_price_events_player_registration_id_created_at_idx" ON "player_price_events"("player_registration_id", "created_at");

ALTER TABLE "player_prices" ADD CONSTRAINT "player_prices_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_prices" ADD CONSTRAINT "player_prices_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_price_events" ADD CONSTRAINT "player_price_events_player_price_id_fkey" FOREIGN KEY ("player_price_id") REFERENCES "player_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_price_events" ADD CONSTRAINT "player_price_events_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_price_events" ADD CONSTRAINT "player_price_events_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
