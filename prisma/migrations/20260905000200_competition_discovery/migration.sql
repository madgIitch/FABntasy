ALTER TABLE "competition_seasons"
ADD COLUMN "fantasy_role" TEXT NOT NULL DEFAULT 'disabled',
ADD COLUMN "category_name" TEXT,
ADD COLUMN "delegation_name" TEXT;

CREATE UNIQUE INDEX "competition_seasons_one_primary_fantasy_idx"
ON "competition_seasons" ("fantasy_role")
WHERE "fantasy_role" = 'primary';

ALTER TABLE "competition_seasons"
ADD CONSTRAINT "competition_seasons_fantasy_role_check"
CHECK ("fantasy_role" IN ('disabled', 'validation', 'primary'));
