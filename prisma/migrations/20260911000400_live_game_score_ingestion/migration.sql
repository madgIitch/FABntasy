ALTER TABLE "games"
  ADD COLUMN "score_source" TEXT,
  ADD COLUMN "live_score_updated_at" TIMESTAMPTZ(3);

CREATE INDEX "games_status_scheduled_at_idx"
  ON "games" ("status", "scheduled_at");
