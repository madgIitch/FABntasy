CREATE TABLE "market_v2_settings" (
  "id" VARCHAR(32) NOT NULL DEFAULT 'global',
  "started_at" TIMESTAMPTZ(3) NOT NULL,
  "started_by_profile_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_v2_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "market_v2_cycles" (
  "id" UUID NOT NULL,
  "league_id" UUID NOT NULL,
  "opens_at" TIMESTAMPTZ(3) NOT NULL,
  "closes_at" TIMESTAMPTZ(3) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  "settled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_v2_cycles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "market_v2_cycles_league_id_opens_at_key" ON "market_v2_cycles"("league_id", "opens_at");
CREATE INDEX "market_v2_cycles_status_closes_at_idx" ON "market_v2_cycles"("status", "closes_at");

CREATE TABLE "market_v2_listings" (
  "id" UUID NOT NULL,
  "cycle_id" UUID NOT NULL,
  "league_id" UUID NOT NULL,
  "player_registration_id" UUID NOT NULL,
  "reference_price" BIGINT NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_v2_listings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "market_v2_listings_cycle_id_player_registration_id_key" ON "market_v2_listings"("cycle_id", "player_registration_id");
CREATE INDEX "market_v2_listings_league_id_player_registration_id_created_idx" ON "market_v2_listings"("league_id", "player_registration_id", "created_at");

CREATE TABLE "market_v2_bids" (
  "id" UUID NOT NULL,
  "listing_id" UUID NOT NULL,
  "fantasy_team_id" UUID NOT NULL,
  "amount_credits" BIGINT NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  "bid_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "transaction_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "market_v2_bids_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "market_v2_bids_listing_id_fantasy_team_id_key" ON "market_v2_bids"("listing_id", "fantasy_team_id");
CREATE UNIQUE INDEX "market_v2_bids_transaction_id_key" ON "market_v2_bids"("transaction_id");
CREATE INDEX "market_v2_bids_fantasy_team_id_status_idx" ON "market_v2_bids"("fantasy_team_id", "status");
CREATE INDEX "market_v2_bids_listing_id_status_amount_credits_bid_at_idx" ON "market_v2_bids"("listing_id", "status", "amount_credits", "bid_at");

CREATE TABLE "market_v2_requests" (
  "idempotency_key" VARCHAR(100) NOT NULL,
  "listing_id" UUID NOT NULL,
  "fantasy_team_id" UUID NOT NULL,
  "action" VARCHAR(8) NOT NULL,
  "amount_credits" BIGINT,
  "bid_id" UUID NOT NULL,
  "result_status" VARCHAR(16) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_v2_requests_pkey" PRIMARY KEY ("idempotency_key")
);
CREATE INDEX "market_v2_requests_fantasy_team_id_created_at_idx" ON "market_v2_requests"("fantasy_team_id", "created_at");

ALTER TABLE "market_v2_cycles" ADD CONSTRAINT "market_v2_cycles_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_v2_listings" ADD CONSTRAINT "market_v2_listings_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "market_v2_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_v2_listings" ADD CONSTRAINT "market_v2_listings_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_v2_listings" ADD CONSTRAINT "market_v2_listings_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_v2_bids" ADD CONSTRAINT "market_v2_bids_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "market_v2_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_v2_bids" ADD CONSTRAINT "market_v2_bids_fantasy_team_id_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_v2_bids" ADD CONSTRAINT "market_v2_bids_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "market_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_v2_requests" ADD CONSTRAINT "market_v2_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "market_v2_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_v2_requests" ADD CONSTRAINT "market_v2_requests_fantasy_team_id_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
