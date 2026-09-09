-- Deletes only the deterministic sports foundation associated with this run.
BEGIN;
DO $$
DECLARE
  v_run text := {{run_id}};
  v_fed uuid := md5(v_run || ':federation')::uuid;
  v_comp uuid := md5(v_run || ':competition')::uuid;
  v_season uuid := md5(v_run || ':season')::uuid;
  v_cs uuid := md5(v_run || ':competition-season')::uuid;
  v_group uuid := md5(v_run || ':group')::uuid;
BEGIN
  IF EXISTS(SELECT 1 FROM federations WHERE id=v_fed AND name <> 'CANASTIO TEST ' || v_run) THEN
    RAISE EXCEPTION '14F ownership guard failed for run %',v_run;
  END IF;
  IF EXISTS(SELECT 1 FROM fantasy_teams WHERE competition_season_id=v_cs) THEN
    RAISE EXCEPTION '14F refuses sports-only teardown while fantasy data exists for run %',v_run;
  END IF;
  DELETE FROM player_game_stats WHERE game_id IN (SELECT id FROM games WHERE competition_season_id=v_cs);
  DELETE FROM games WHERE competition_season_id=v_cs;
  DELETE FROM rounds WHERE group_id=v_group;
  DELETE FROM player_registrations WHERE competition_season_id=v_cs;
  DELETE FROM team_registrations WHERE competition_season_id=v_cs;
  DELETE FROM groups WHERE id=v_group;
  DELETE FROM competition_seasons WHERE id=v_cs;
  DELETE FROM players WHERE id IN (SELECT md5(v_run || ':player:' || i || ':' || j)::uuid FROM generate_series(1,{{real_teams}}) i CROSS JOIN generate_series(1,{{players_per_team}}) j);
  DELETE FROM teams WHERE id IN (SELECT md5(v_run || ':team:' || i)::uuid FROM generate_series(1,{{real_teams}}) i);
  DELETE FROM competitions WHERE id=v_comp;
  DELETE FROM federations WHERE id=v_fed AND name='CANASTIO TEST ' || v_run;
  DELETE FROM seasons WHERE id=v_season AND NOT EXISTS(SELECT 1 FROM competition_seasons WHERE season_id=v_season);
END $$;
COMMIT;
