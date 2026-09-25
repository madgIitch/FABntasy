-- CreateTable
CREATE TABLE "market_transfer_listings" (
    "id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "player_registration_id" UUID NOT NULL,
    "seller_team_id" UUID NOT NULL,
    "desired_price_credits" BIGINT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "listed_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "market_transfer_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_offer_threads" (
    "id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "player_registration_id" UUID NOT NULL,
    "buyer_team_id" UUID NOT NULL,
    "seller_team_id" UUID NOT NULL,
    "listing_id" UUID,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "market_offer_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_offer_proposals" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "proposer_team_id" UUID NOT NULL,
    "amount_credits" BIGINT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "transaction_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_offer_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_system_offers" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "amount_credits" BIGINT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "transaction_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_system_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_negotiation_requests" (
    "idempotency_key" VARCHAR(100) NOT NULL,
    "actor_team_id" UUID NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_negotiation_requests_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateIndex
CREATE INDEX "market_transfer_listings_league_id_player_registration_id_s_idx" ON "market_transfer_listings"("league_id", "player_registration_id", "status");

-- CreateIndex
CREATE INDEX "market_transfer_listings_status_expires_at_idx" ON "market_transfer_listings"("status", "expires_at");

CREATE UNIQUE INDEX "market_transfer_listings_one_open_player" ON "market_transfer_listings"("league_id", "player_registration_id") WHERE "status" = 'OPEN';

-- CreateIndex
CREATE INDEX "market_offer_threads_league_id_player_registration_id_statu_idx" ON "market_offer_threads"("league_id", "player_registration_id", "status");

-- CreateIndex
CREATE INDEX "market_offer_threads_buyer_team_id_status_idx" ON "market_offer_threads"("buyer_team_id", "status");

-- CreateIndex
CREATE INDEX "market_offer_threads_seller_team_id_status_idx" ON "market_offer_threads"("seller_team_id", "status");

CREATE UNIQUE INDEX "market_offer_threads_one_open_buyer" ON "market_offer_threads"("league_id", "player_registration_id", "buyer_team_id") WHERE "status" = 'OPEN';

-- CreateIndex
CREATE UNIQUE INDEX "market_offer_proposals_transaction_id_key" ON "market_offer_proposals"("transaction_id");

-- CreateIndex
CREATE INDEX "market_offer_proposals_thread_id_status_created_at_idx" ON "market_offer_proposals"("thread_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "market_offer_proposals_status_expires_at_idx" ON "market_offer_proposals"("status", "expires_at");

CREATE UNIQUE INDEX "market_offer_proposals_one_active_thread" ON "market_offer_proposals"("thread_id") WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "market_system_offers_transaction_id_key" ON "market_system_offers"("transaction_id");

-- CreateIndex
CREATE INDEX "market_system_offers_status_expires_at_idx" ON "market_system_offers"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "market_system_offers_listing_id_cycle_id_key" ON "market_system_offers"("listing_id", "cycle_id");

-- CreateIndex
CREATE INDEX "market_negotiation_requests_actor_team_id_created_at_idx" ON "market_negotiation_requests"("actor_team_id", "created_at");

-- AddForeignKey
ALTER TABLE "market_transfer_listings" ADD CONSTRAINT "market_transfer_listings_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_transfer_listings" ADD CONSTRAINT "market_transfer_listings_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_transfer_listings" ADD CONSTRAINT "market_transfer_listings_seller_team_id_fkey" FOREIGN KEY ("seller_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer_threads" ADD CONSTRAINT "market_offer_threads_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer_threads" ADD CONSTRAINT "market_offer_threads_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer_threads" ADD CONSTRAINT "market_offer_threads_buyer_team_id_fkey" FOREIGN KEY ("buyer_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer_threads" ADD CONSTRAINT "market_offer_threads_seller_team_id_fkey" FOREIGN KEY ("seller_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer_threads" ADD CONSTRAINT "market_offer_threads_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "market_transfer_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer_proposals" ADD CONSTRAINT "market_offer_proposals_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "market_offer_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer_proposals" ADD CONSTRAINT "market_offer_proposals_proposer_team_id_fkey" FOREIGN KEY ("proposer_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer_proposals" ADD CONSTRAINT "market_offer_proposals_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "market_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_system_offers" ADD CONSTRAINT "market_system_offers_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "market_transfer_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_system_offers" ADD CONSTRAINT "market_system_offers_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "market_v2_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_system_offers" ADD CONSTRAINT "market_system_offers_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "market_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
