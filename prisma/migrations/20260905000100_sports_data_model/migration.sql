-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "federations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'ES',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "federations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "federation_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_on" DATE,
    "ends_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_seasons" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "name" TEXT,
    "fantasy_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "competition_season_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "starts_on" DATE,
    "ends_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "club_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_registrations" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "competition_season_id" UUID NOT NULL,
    "group_id" UUID,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "provisional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_registrations" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "team_registration_id" UUID NOT NULL,
    "competition_season_id" UUID NOT NULL,
    "shirt_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "competition_season_id" UUID NOT NULL,
    "group_id" UUID,
    "round_id" UUID,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ(3),
    "source_timezone" TEXT,
    "round_number" INTEGER,
    "status" TEXT NOT NULL,
    "source_status" TEXT,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "score_by_period" JSONB,
    "source_score" JSONB,
    "record_type" TEXT,
    "has_statistics" BOOLEAN NOT NULL DEFAULT false,
    "source_updated_at" TIMESTAMPTZ(3),
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_game_stats" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "player_registration_id" UUID NOT NULL,
    "starter" BOOLEAN,
    "minutes_played" DECIMAL(8,3),
    "milliseconds_played" INTEGER,
    "points" INTEGER,
    "free_throws_made" INTEGER,
    "free_throws_attempted" INTEGER,
    "two_pointers_made" INTEGER,
    "two_pointers_attempted" INTEGER,
    "three_pointers_made" INTEGER,
    "three_pointers_attempted" INTEGER,
    "offensive_rebounds" INTEGER,
    "defensive_rebounds" INTEGER,
    "rebounds" INTEGER,
    "assists" INTEGER,
    "steals" INTEGER,
    "turnovers" INTEGER,
    "blocks" INTEGER,
    "blocks_received" INTEGER,
    "fouls_committed" INTEGER,
    "fouls_received" INTEGER,
    "technical_fouls" INTEGER,
    "valuation" INTEGER,
    "plus_minus" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_ids" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_fab_payloads" (
    "id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "external_id" TEXT,
    "retrieved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "http_status" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_fab_payloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "federations_name_country_code_key" ON "federations"("name", "country_code");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_federation_id_name_key" ON "competitions"("federation_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_name_key" ON "seasons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "competition_seasons_competition_id_season_id_key" ON "competition_seasons"("competition_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_competition_season_id_name_key" ON "groups"("competition_season_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_group_id_number_key" ON "rounds"("group_id", "number");

-- CreateIndex
CREATE INDEX "teams_name_idx" ON "teams"("name");

-- CreateIndex
CREATE INDEX "team_registrations_competition_season_id_group_id_idx" ON "team_registrations"("competition_season_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_registrations_team_id_competition_season_id_key" ON "team_registrations"("team_id", "competition_season_id");

-- CreateIndex
CREATE INDEX "players_display_name_idx" ON "players"("display_name");

-- CreateIndex
CREATE INDEX "player_registrations_competition_season_id_idx" ON "player_registrations"("competition_season_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_registrations_player_id_team_registration_id_key" ON "player_registrations"("player_id", "team_registration_id");

-- CreateIndex
CREATE INDEX "games_competition_season_id_round_number_idx" ON "games"("competition_season_id", "round_number");

-- CreateIndex
CREATE INDEX "games_scheduled_at_idx" ON "games"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "player_game_stats_game_id_player_registration_id_key" ON "player_game_stats"("game_id", "player_registration_id");

-- CreateIndex
CREATE INDEX "external_ids_source_entity_type_entity_id_idx" ON "external_ids"("source", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_ids_source_entity_type_external_id_key" ON "external_ids"("source", "entity_type", "external_id");

-- CreateIndex
CREATE INDEX "raw_fab_payloads_entity_type_external_id_retrieved_at_idx" ON "raw_fab_payloads"("entity_type", "external_id", "retrieved_at");

-- CreateIndex
CREATE UNIQUE INDEX "raw_fab_payloads_endpoint_checksum_key" ON "raw_fab_payloads"("endpoint", "checksum");

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_federation_id_fkey" FOREIGN KEY ("federation_id") REFERENCES "federations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_seasons_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_seasons_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_registrations" ADD CONSTRAINT "team_registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_registrations" ADD CONSTRAINT "team_registrations_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_registrations" ADD CONSTRAINT "team_registrations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_registrations" ADD CONSTRAINT "player_registrations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_registrations" ADD CONSTRAINT "player_registrations_team_registration_id_fkey" FOREIGN KEY ("team_registration_id") REFERENCES "team_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_registrations" ADD CONSTRAINT "player_registrations_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_player_registration_id_fkey" FOREIGN KEY ("player_registration_id") REFERENCES "player_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
