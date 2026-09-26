ALTER TABLE "league_invites" ADD COLUMN "token_ciphertext" VARCHAR(255);
ALTER TABLE "league_invites" ALTER COLUMN "expires_at" DROP NOT NULL;
UPDATE "league_invites" SET "status" = 'REVOKED', "revoked_at" = COALESCE("revoked_at", now()) WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "league_invites_one_active_per_league" ON "league_invites" ("league_id") WHERE "status" = 'ACTIVE';
