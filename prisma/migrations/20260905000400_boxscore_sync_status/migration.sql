ALTER TABLE "games"
ADD COLUMN "stats_sync_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "stats_synced_at" TIMESTAMPTZ(3);

CREATE INDEX "games_competition_season_id_stats_sync_status_idx"
ON "games"("competition_season_id", "stats_sync_status");
