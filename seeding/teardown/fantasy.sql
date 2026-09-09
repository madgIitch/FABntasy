-- FK-ordered teardown for fantasy entities owned by one deterministic 14F run.
BEGIN;
-- Test-only teardown: immutable audit triggers are a production invariant. The runner
-- permits this file exclusively against an explicitly marked disposable test DB.
SET LOCAL session_replication_role = replica;
DO $$
DECLARE
  v_run text := {{run_id}};
  v_cs uuid := md5(v_run || ':competition-season')::uuid;
  v_league uuid := md5(v_run || ':league')::uuid;
  v_second_league uuid := md5(v_run || ':league:2')::uuid;
BEGIN
  DELETE FROM fantasy_player_game_scores WHERE game_id IN (SELECT id FROM games WHERE competition_season_id=v_cs);
  IF EXISTS(SELECT 1 FROM fantasy_leagues WHERE id=v_league AND name<>'Liga Sintética ' || v_run) THEN
    RAISE EXCEPTION '14F fantasy ownership guard failed for run %',v_run;
  END IF;
  DELETE FROM fantasy_team_totals WHERE league_id IN(v_league,v_second_league);
  DELETE FROM fantasy_round_scores WHERE league_id IN(v_league,v_second_league);
  DELETE FROM fantasy_lineup_slots WHERE fantasy_lineup_id IN (SELECT id FROM fantasy_lineups WHERE fantasy_team_id IN (SELECT id FROM fantasy_teams WHERE league_id IN(v_league,v_second_league)));
  DELETE FROM fantasy_lineups WHERE fantasy_team_id IN (SELECT id FROM fantasy_teams WHERE league_id IN(v_league,v_second_league));
  DELETE FROM clause_investments WHERE fantasy_roster_slot_id IN (SELECT id FROM fantasy_roster_slots WHERE league_id IN(v_league,v_second_league));
  DELETE FROM market_protections WHERE league_id IN(v_league,v_second_league);
  DELETE FROM fantasy_budget_ledger WHERE league_id IN(v_league,v_second_league);
  DELETE FROM fantasy_roster_slots WHERE league_id IN(v_league,v_second_league);
  DELETE FROM market_transactions WHERE league_id IN(v_league,v_second_league);
  DELETE FROM fantasy_teams WHERE league_id IN(v_league,v_second_league);
  DELETE FROM league_invites WHERE league_id IN(v_league,v_second_league);
  DELETE FROM league_memberships WHERE league_id IN(v_league,v_second_league);
  DELETE FROM fantasy_leagues WHERE id=v_second_league AND name='Liga Secundaria ' || v_run;
  DELETE FROM fantasy_leagues WHERE id=v_league AND name='Liga Sintética ' || v_run;
  DELETE FROM player_price_events WHERE competition_season_id=v_cs AND algorithm_version='14f-v1';
  DELETE FROM player_prices WHERE competition_season_id=v_cs AND algorithm_version='14f-v1';
  DELETE FROM fantasy_rule_set_activations WHERE competition_season_id=v_cs;
  UPDATE fantasy_scoring_rule_sets SET status='DRAFT',published_at=NULL WHERE competition_season_id=v_cs AND identifier='14f-' || v_run;
  DELETE FROM fantasy_scoring_rule_sets WHERE competition_season_id=v_cs AND identifier='14f-' || v_run;
  DELETE FROM fantasy_roster_rule_sets WHERE competition_season_id=v_cs AND identifier='14f-' || v_run;
  DELETE FROM user_profiles WHERE id IN (SELECT md5(v_run || ':profile:' || i)::uuid FROM generate_series(0,{{managers}}) i);
  DELETE FROM auth.users WHERE id IN (SELECT md5(v_run || ':auth:' || i)::uuid FROM generate_series(0,{{managers}}) i);
END $$;
COMMIT;
