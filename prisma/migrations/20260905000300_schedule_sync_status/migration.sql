ALTER TABLE "games"
ADD COLUMN "sync_status" TEXT NOT NULL DEFAULT 'active';

CREATE INDEX "games_competition_season_id_sync_status_idx"
ON "games"("competition_season_id", "sync_status");
