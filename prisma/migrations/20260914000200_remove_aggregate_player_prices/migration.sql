-- Remove market pricing generated for FAB aggregate boxscore rows.
-- Player/stat rows are retained for audit; current ingestion excludes them before persistence.
DELETE FROM "player_price_events" AS event
USING "player_registrations" AS registration, "players" AS player
WHERE event."player_registration_id" = registration."id"
  AND registration."player_id" = player."id"
  AND lower(btrim(player."display_name")) = 'totales';

DELETE FROM "player_prices" AS price
USING "player_registrations" AS registration, "players" AS player
WHERE price."player_registration_id" = registration."id"
  AND registration."player_id" = player."id"
  AND lower(btrim(player."display_name")) = 'totales';
