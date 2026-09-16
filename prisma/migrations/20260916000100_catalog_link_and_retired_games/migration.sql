WITH ranked AS (
  SELECT id, category_competition_id,
         first_value(id) OVER (
           PARTITION BY category_competition_id
           ORDER BY (competition_season_id IS NOT NULL) DESC, monitored DESC, first_seen_at, id
         ) AS keeper_id
  FROM fab_competition_catalog
), merged AS (
  SELECT r.keeper_id,
         bool_or(c.monitored) AS monitored,
         min(c.first_seen_at) AS first_seen_at,
         max(c.last_checked_at) AS last_checked_at,
         max(c.last_changed_at) AS last_changed_at,
         (array_agg(c.competition_season_id ORDER BY (c.competition_season_id IS NOT NULL) DESC))[1] AS competition_season_id
  FROM ranked r
  JOIN fab_competition_catalog c ON c.category_competition_id = r.category_competition_id
  GROUP BY r.keeper_id
)
UPDATE fab_competition_catalog c
SET monitored = m.monitored,
    first_seen_at = m.first_seen_at,
    last_checked_at = m.last_checked_at,
    last_changed_at = m.last_changed_at,
    competition_season_id = COALESCE(c.competition_season_id, m.competition_season_id)
FROM merged m
WHERE c.id = m.keeper_id;

WITH ranked_changes AS (
  SELECT ch.id,
         first_value(ch.id) OVER (
           PARTITION BY c.category_competition_id, ch.checksum
           ORDER BY (c.competition_season_id IS NOT NULL) DESC, c.monitored DESC,
                    c.first_seen_at, c.id, ch.created_at, ch.id
         ) AS keeper_change_id
  FROM fab_competition_catalog_changes ch
  JOIN fab_competition_catalog c ON c.id = ch.catalog_id
)
DELETE FROM fab_competition_catalog_changes ch
USING ranked_changes r
WHERE ch.id = r.id AND r.id <> r.keeper_change_id;

WITH ranked AS (
  SELECT id, category_competition_id,
         first_value(id) OVER (
           PARTITION BY category_competition_id
           ORDER BY (competition_season_id IS NOT NULL) DESC, monitored DESC, first_seen_at, id
         ) AS keeper_id
  FROM fab_competition_catalog
)
UPDATE fab_competition_catalog_changes ch
SET catalog_id = r.keeper_id
FROM ranked r
WHERE ch.catalog_id = r.id AND r.id <> r.keeper_id;

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY category_competition_id
           ORDER BY (competition_season_id IS NOT NULL) DESC, monitored DESC, first_seen_at, id
         ) AS keeper_id
  FROM fab_competition_catalog
)
DELETE FROM fab_competition_catalog c
USING ranked r
WHERE c.id = r.id AND r.id <> r.keeper_id;

UPDATE fab_competition_catalog c
SET competition_season_id = e.entity_id,
    monitored = c.monitored OR TRUE
FROM external_ids e
WHERE e.source = 'FAB_CATEGORY_COMPETITION'
  AND e.entity_type = 'competition_season'
  AND e.external_id = c.category_competition_id
  AND c.competition_season_id IS NULL;

DROP INDEX IF EXISTS fab_competition_catalog_category_competition_id_idx;
CREATE UNIQUE INDEX fab_competition_catalog_category_competition_id_key
  ON fab_competition_catalog(category_competition_id);
