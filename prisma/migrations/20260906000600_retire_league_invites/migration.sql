UPDATE "league_invites"
SET "status" = 'REVOKED', "revoked_at" = now()
WHERE "status" = 'ACTIVE';
