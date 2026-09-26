CREATE TABLE "league_competition_seasons" (
    "league_id" UUID NOT NULL,
    "competition_season_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "league_competition_seasons_pkey" PRIMARY KEY ("league_id","competition_season_id")
);

CREATE INDEX "league_competition_seasons_competition_season_id_idx" ON "league_competition_seasons"("competition_season_id");

ALTER TABLE "league_competition_seasons" ADD CONSTRAINT "league_competition_seasons_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_competition_seasons" ADD CONSTRAINT "league_competition_seasons_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "league_competition_seasons" ("league_id", "competition_season_id")
SELECT "id", "competition_season_id" FROM "fantasy_leagues";
