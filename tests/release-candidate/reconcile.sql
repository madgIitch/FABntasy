\set ON_ERROR_STOP on

-- Required psql variables:
--   competition_season_id UUID
--   round_number integer
-- Zero returned rows means the persisted RC invariants pass.

WITH violations AS (
  SELECT 'duplicate_player_game_stat' AS invariant, game_id::text AS subject
  FROM player_game_stats
  WHERE game_id IN (
    SELECT id FROM games
    WHERE competition_season_id = :'competition_season_id'::uuid
      AND round_number = :'round_number'::integer
  )
  GROUP BY game_id, player_registration_id
  HAVING count(*) > 1

  UNION ALL

  SELECT 'duplicate_fantasy_score_input', player_game_stat_id::text
  FROM fantasy_player_game_scores
  WHERE game_id IN (
    SELECT id FROM games
    WHERE competition_season_id = :'competition_season_id'::uuid
      AND round_number = :'round_number'::integer
  )
  GROUP BY player_game_stat_id, rule_set_id, source_stats_version
  HAVING count(*) > 1

  UNION ALL

  SELECT 'multiple_current_round_scores', fantasy_team_id::text
  FROM fantasy_round_scores
  WHERE competition_season_id = :'competition_season_id'::uuid
    AND round_number = :'round_number'::integer
    AND superseded_at IS NULL
  GROUP BY fantasy_team_id
  HAVING count(*) > 1

  UNION ALL

  SELECT 'published_round_without_points', id::text
  FROM fantasy_round_scores
  WHERE competition_season_id = :'competition_season_id'::uuid
    AND round_number = :'round_number'::integer
    AND superseded_at IS NULL
    AND status = 'PUBLISHED'
    AND (points IS NULL OR published_at IS NULL)

  UNION ALL

  SELECT 'provisional_round_published', id::text
  FROM fantasy_round_scores
  WHERE competition_season_id = :'competition_season_id'::uuid
    AND round_number = :'round_number'::integer
    AND superseded_at IS NULL
    AND status <> 'PUBLISHED'
    AND published_at IS NOT NULL

  UNION ALL

  SELECT 'price_event_duplicate', player_price_id::text
  FROM player_price_events
  WHERE competition_season_id = :'competition_season_id'::uuid
    AND round_number = :'round_number'::integer
  GROUP BY player_price_id, round_number, algorithm_version, input_revision
  HAVING count(*) > 1
)
SELECT invariant, subject
FROM violations
ORDER BY invariant, subject;

-- Ranking coverage: record these counts in the RC report and require every
-- league declared in the private manifest to have current totals.
SELECT
  count(*) FILTER (WHERE global_position IS NOT NULL) AS global_ranked_teams,
  count(*) FILTER (WHERE league_position IS NOT NULL) AS private_ranked_teams,
  count(DISTINCT league_id) AS ranked_private_leagues
FROM fantasy_team_totals
WHERE competition_season_id = :'competition_season_id'::uuid;
