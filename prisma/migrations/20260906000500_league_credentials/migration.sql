ALTER TABLE "fantasy_leagues"
  ADD COLUMN "league_code" VARCHAR(12),
  ADD COLUMN "password_hash" VARCHAR(255);

UPDATE "fantasy_leagues"
SET "league_code" = 'CNST-' || upper(substr(replace("id"::text, '-', ''), 1, 6));

ALTER TABLE "fantasy_leagues"
  ALTER COLUMN "league_code" SET NOT NULL;

CREATE UNIQUE INDEX "fantasy_leagues_league_code_key"
  ON "fantasy_leagues"("league_code");
