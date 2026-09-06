ALTER TABLE "fantasy_teams" ADD COLUMN "balance_credits" BIGINT;
ALTER TABLE "fantasy_roster_slots" ADD COLUMN "league_id" UUID;

UPDATE "fantasy_roster_slots" slot
SET "league_id" = team."league_id"
FROM "fantasy_teams" team
WHERE slot."fantasy_team_id" = team."id";

ALTER TABLE "fantasy_roster_slots" ALTER COLUMN "league_id" SET NOT NULL;
ALTER TABLE "fantasy_roster_slots" ADD CONSTRAINT "fantasy_roster_slots_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "fantasy_roster_slots_league_id_player_registration_id_key" ON "fantasy_roster_slots"("league_id", "player_registration_id");
CREATE INDEX "fantasy_roster_slots_league_id_idx" ON "fantasy_roster_slots"("league_id");

UPDATE "fantasy_teams" team
SET "balance_credits" = rules."budget_credits" - COALESCE((SELECT SUM(slot."acquisition_price") FROM "fantasy_roster_slots" slot WHERE slot."fantasy_team_id" = team."id"), 0)
FROM "fantasy_roster_rule_sets" rules
WHERE team."roster_rule_set_id" = rules."id";

CREATE TABLE "market_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "league_id" UUID NOT NULL, "player_registration_id" UUID NOT NULL,
  "buyer_team_id" UUID, "seller_team_id" UUID, "transaction_type" TEXT NOT NULL, "price_credits" BIGINT NOT NULL,
  "market_price_credits" BIGINT NOT NULL, "clause_base_credits" BIGINT, "clause_investment_credits" BIGINT,
  "round_number" INTEGER, "idempotency_key" TEXT NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "market_transactions_idempotency_key_key" ON "market_transactions"("idempotency_key");
CREATE INDEX "market_transactions_league_id_created_at_idx" ON "market_transactions"("league_id", "created_at");
CREATE INDEX "market_transactions_player_registration_id_league_id_idx" ON "market_transactions"("player_registration_id", "league_id");
ALTER TABLE "market_transactions" ADD CONSTRAINT "market_transactions_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_transactions" ADD CONSTRAINT "market_transactions_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_transactions" ADD CONSTRAINT "market_transactions_buyer_team_id_fkey" FOREIGN KEY ("buyer_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_transactions" ADD CONSTRAINT "market_transactions_seller_team_id_fkey" FOREIGN KEY ("seller_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "fantasy_budget_ledger" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "fantasy_team_id" UUID NOT NULL, "league_id" UUID NOT NULL,
  "transaction_id" UUID, "entry_type" TEXT NOT NULL, "amount_credits" BIGINT NOT NULL, "balance_after" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "fantasy_budget_ledger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fantasy_budget_ledger_fantasy_team_id_created_at_idx" ON "fantasy_budget_ledger"("fantasy_team_id", "created_at");
CREATE INDEX "fantasy_budget_ledger_league_id_created_at_idx" ON "fantasy_budget_ledger"("league_id", "created_at");
ALTER TABLE "fantasy_budget_ledger" ADD CONSTRAINT "fantasy_budget_ledger_fantasy_team_id_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fantasy_budget_ledger" ADD CONSTRAINT "fantasy_budget_ledger_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fantasy_budget_ledger" ADD CONSTRAINT "fantasy_budget_ledger_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "market_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "fantasy_budget_ledger" ("fantasy_team_id", "league_id", "entry_type", "amount_credits", "balance_after")
SELECT "id", "league_id", 'INITIAL_BALANCE', "balance_credits", "balance_credits" FROM "fantasy_teams" WHERE "balance_credits" IS NOT NULL;

CREATE TABLE "clause_investments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "fantasy_roster_slot_id" UUID NOT NULL, "spent_credits" BIGINT NOT NULL DEFAULT 0,
  "clause_bonus_credits" BIGINT NOT NULL DEFAULT 0, "updated_at" TIMESTAMPTZ(3) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clause_investments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clause_investments_fantasy_roster_slot_id_key" ON "clause_investments"("fantasy_roster_slot_id");
ALTER TABLE "clause_investments" ADD CONSTRAINT "clause_investments_fantasy_roster_slot_id_fkey" FOREIGN KEY ("fantasy_roster_slot_id") REFERENCES "fantasy_roster_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "market_protections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "league_id" UUID NOT NULL, "fantasy_team_id" UUID NOT NULL,
  "player_registration_id" UUID, "protection_type" TEXT NOT NULL, "round_number" INTEGER NOT NULL,
  "protected_until" TIMESTAMPTZ(3) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_protections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "market_protections_league_id_round_number_protection_type_idx" ON "market_protections"("league_id", "round_number", "protection_type");
CREATE INDEX "market_protections_fantasy_team_id_protected_until_idx" ON "market_protections"("fantasy_team_id", "protected_until");
ALTER TABLE "market_protections" ADD CONSTRAINT "market_protections_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_protections" ADD CONSTRAINT "market_protections_fantasy_team_id_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "fantasy_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_protections" ADD CONSTRAINT "market_protections_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
