-- Raises on identity, league, ownership or budget-ledger violations.
DO $$
DECLARE
  v_run text := {{run_id}};
  v_cs uuid := md5(v_run || ':competition-season')::uuid;
  v_league uuid := md5(v_run || ':league')::uuid;
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM league_memberships WHERE league_id=v_league AND status='ACTIVE';
  IF v_count <> {{managers}} THEN RAISE EXCEPTION '14F managers: expected %, found %',{{managers}},v_count; END IF;

  SELECT count(*) INTO v_count FROM fantasy_teams WHERE league_id=v_league;
  IF v_count <> {{managers}} THEN RAISE EXCEPTION '14F fantasy teams: expected %, found %',{{managers}},v_count; END IF;

  SELECT count(*) INTO v_count FROM player_prices WHERE competition_season_id=v_cs AND algorithm_version='canastio-market-v1';
  IF v_count <> ({{real_teams}} * {{players_per_team}}) THEN RAISE EXCEPTION '14F prices: invalid count %',v_count; END IF;

  IF EXISTS(
    SELECT 1 FROM fantasy_teams ft
    LEFT JOIN LATERAL (
      SELECT balance_after FROM fantasy_budget_ledger l WHERE l.fantasy_team_id=ft.id ORDER BY l.created_at DESC,l.id DESC LIMIT 1
    ) last_entry ON true
    WHERE ft.league_id=v_league AND (last_entry.balance_after IS NULL OR last_entry.balance_after<>ft.balance_credits)
  ) THEN RAISE EXCEPTION '14F latest ledger balance does not match fantasy team balance'; END IF;

  IF EXISTS(
    SELECT 1 FROM fantasy_teams ft
    JOIN LATERAL (SELECT sum(amount_credits) total FROM fantasy_budget_ledger l WHERE l.fantasy_team_id=ft.id) ledger ON true
    WHERE ft.league_id=v_league AND ledger.total<>ft.balance_credits
  ) THEN RAISE EXCEPTION '14F cumulative ledger does not match fantasy team balance'; END IF;

  IF EXISTS(SELECT 1 FROM fantasy_roster_slots WHERE league_id=v_league GROUP BY player_registration_id HAVING count(*)>1) THEN
    RAISE EXCEPTION '14F duplicated player ownership';
  END IF;

  IF EXISTS(SELECT 1 FROM user_profiles WHERE auth_user_id=COALESCE((SELECT (x->>'authUserId')::uuid FROM jsonb_array_elements({{identity_map}}::jsonb) x WHERE x->>'slot'='00'),md5(v_run || ':auth:0')::uuid) AND username IS NULL) THEN
    RAISE EXCEPTION '14F synthetic onboarding profile has no username';
  END IF;
END $$;
