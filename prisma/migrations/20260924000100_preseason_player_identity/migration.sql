ALTER TABLE "player_registrations"
  ADD COLUMN "identity_status" TEXT NOT NULL DEFAULT 'BOXSCORE_ONLY',
  ADD COLUMN "roster_seen_at" TIMESTAMPTZ(3);

ALTER TABLE "player_registrations"
  ADD CONSTRAINT "player_registrations_identity_status_check"
  CHECK ("identity_status" IN ('BOXSCORE_ONLY', 'ROSTER_ONLY', 'TENTATIVE', 'VERIFIED', 'CONFLICT'));

CREATE INDEX "player_registrations_competition_identity_idx"
  ON "player_registrations" ("competition_season_id", "identity_status");
