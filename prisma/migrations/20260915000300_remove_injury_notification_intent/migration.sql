DELETE FROM "notification_preferences"
WHERE "intent" = 'TEAM_INJURY';

UPDATE "push_outbox_events"
SET "status" = 'FAILED',
    "last_error_code" = 'RETIRED_INTENT',
    "claimed_at" = NULL,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "payload"->>'intent' = 'TEAM_INJURY'
  AND "status" IN ('PENDING', 'PROCESSING', 'RETRYABLE');

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_intent_check"
CHECK ("intent" IN (
  'MARKET_PRICE', 'MARKET_OFFER', 'MARKET_OUTBID', 'MARKET_SOLD',
  'TEAM_CUTOFF', 'TEAM_LINEUP',
  'LEAGUE_CLAUSE', 'LEAGUE_ACTIVITY', 'LEAGUE_MESSAGE',
  'ROUND_START', 'ROUND_RESULT'
));

ALTER TABLE "notification_deliveries"
ADD CONSTRAINT "notification_deliveries_intent_check"
CHECK ("intent" IN (
  'MARKET_PRICE', 'MARKET_OFFER', 'MARKET_OUTBID', 'MARKET_SOLD',
  'TEAM_CUTOFF', 'TEAM_LINEUP',
  'LEAGUE_CLAUSE', 'LEAGUE_ACTIVITY', 'LEAGUE_MESSAGE',
  'ROUND_START', 'ROUND_RESULT'
)) NOT VALID;

ALTER TABLE "push_outbox_events"
ADD CONSTRAINT "push_outbox_events_intent_check"
CHECK (("payload"->>'intent') IS NOT NULL AND ("payload"->>'intent') IN (
  'MARKET_PRICE', 'MARKET_OFFER', 'MARKET_OUTBID', 'MARKET_SOLD',
  'TEAM_CUTOFF', 'TEAM_LINEUP',
  'LEAGUE_CLAUSE', 'LEAGUE_ACTIVITY', 'LEAGUE_MESSAGE',
  'ROUND_START', 'ROUND_RESULT'
)) NOT VALID;
