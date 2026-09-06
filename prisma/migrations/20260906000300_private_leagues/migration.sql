CREATE TABLE "fantasy_leagues" (
  "id" UUID NOT NULL, "competition_season_id" UUID NOT NULL, "owner_profile_id" UUID NOT NULL,
  "name" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "member_limit" INTEGER NOT NULL DEFAULT 20,
  "version" INTEGER NOT NULL DEFAULT 1, "legacy_team_id" UUID, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "fantasy_leagues_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fantasy_leagues_member_limit" CHECK ("member_limit" BETWEEN 2 AND 20)
);
CREATE TABLE "league_memberships" (
  "id" UUID NOT NULL, "league_id" UUID NOT NULL, "user_profile_id" UUID NOT NULL, "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "left_at" TIMESTAMPTZ(3),
  CONSTRAINT "league_memberships_pkey" PRIMARY KEY ("id"), CONSTRAINT "league_memberships_role" CHECK ("role" IN ('OWNER','MEMBER')),
  CONSTRAINT "league_memberships_status" CHECK ("status" IN ('ACTIVE','LEFT'))
);
CREATE TABLE "league_invites" (
  "id" UUID NOT NULL, "league_id" UUID NOT NULL, "token_hash" CHAR(64) NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expires_at" TIMESTAMPTZ(3) NOT NULL, "revoked_at" TIMESTAMPTZ(3), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_invites_pkey" PRIMARY KEY ("id"), CONSTRAINT "league_invites_status" CHECK ("status" IN ('ACTIVE','REVOKED'))
);
ALTER TABLE "fantasy_teams" ADD COLUMN "league_id" UUID;
INSERT INTO "fantasy_leagues" ("id","competition_season_id","owner_profile_id","name","legacy_team_id")
SELECT gen_random_uuid(), "competition_season_id", "user_profile_id", 'Liga personal', "id" FROM "fantasy_teams";
INSERT INTO "league_memberships" ("id","league_id","user_profile_id","role")
SELECT gen_random_uuid(), "id", "owner_profile_id", 'OWNER' FROM "fantasy_leagues" WHERE "legacy_team_id" IS NOT NULL;
UPDATE "fantasy_teams" t SET "league_id"=l."id" FROM "fantasy_leagues" l WHERE l."legacy_team_id"=t."id";
ALTER TABLE "fantasy_teams" ALTER COLUMN "league_id" SET NOT NULL;
DROP INDEX "fantasy_teams_user_profile_id_competition_season_id_key";
CREATE UNIQUE INDEX "fantasy_teams_user_profile_id_league_id_key" ON "fantasy_teams"("user_profile_id","league_id");
CREATE INDEX "fantasy_teams_competition_season_id_idx" ON "fantasy_teams"("competition_season_id");
CREATE UNIQUE INDEX "fantasy_leagues_legacy_team_id_key" ON "fantasy_leagues"("legacy_team_id");
CREATE INDEX "fantasy_leagues_competition_season_id_status_idx" ON "fantasy_leagues"("competition_season_id","status");
CREATE INDEX "fantasy_leagues_owner_profile_id_idx" ON "fantasy_leagues"("owner_profile_id");
CREATE UNIQUE INDEX "league_memberships_league_id_user_profile_id_key" ON "league_memberships"("league_id","user_profile_id");
CREATE INDEX "league_memberships_user_profile_id_status_idx" ON "league_memberships"("user_profile_id","status");
CREATE UNIQUE INDEX "league_invites_token_hash_key" ON "league_invites"("token_hash");
CREATE INDEX "league_invites_league_id_status_idx" ON "league_invites"("league_id","status");
ALTER TABLE "fantasy_leagues" ADD CONSTRAINT "fantasy_leagues_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fantasy_leagues" ADD CONSTRAINT "fantasy_leagues_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "league_invites" ADD CONSTRAINT "league_invites_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "fantasy_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
