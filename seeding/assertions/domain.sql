-- Scenario-aware roster, lineup, temporal and price assertions.
DO $$
DECLARE
  v_run text := {{run_id}};
  v_scenario text := {{scenario}};
  v_cs uuid := md5(v_run || ':competition-season')::uuid;
  v_team uuid := md5(v_run || ':fantasy-team:1')::uuid;
  v_expected integer := 0;
  v_count integer;
BEGIN
  IF v_scenario IN ('market.partial-roster','market.operations','market.rejections') THEN v_expected:=2; END IF;
  IF v_scenario IN ('lineup.draft','lineup.locked','round.live','round.finished','round.published','round.corrected','pricing.history','league.activity','account.multi-league') THEN v_expected:=7; END IF;
  SELECT count(*) INTO v_count FROM fantasy_roster_slots WHERE fantasy_team_id=v_team;
  IF v_count<>v_expected THEN RAISE EXCEPTION '14F roster: expected %, found %',v_expected,v_count; END IF;
  IF v_expected>0 AND (SELECT balance_credits FROM fantasy_teams WHERE id=v_team)<>100000000-(v_expected*5000000) THEN RAISE EXCEPTION '14F roster spend not reflected in balance'; END IF;
  IF EXISTS(SELECT 1 FROM fantasy_roster_slots rs JOIN player_registrations pr ON pr.id=rs.player_registration_id JOIN team_registrations tr ON tr.id=pr.team_registration_id WHERE rs.fantasy_team_id=v_team GROUP BY tr.team_id HAVING count(*)>2) THEN RAISE EXCEPTION '14F max-per-real-team violated'; END IF;
  IF v_scenario='lineup.draft' THEN
    SELECT count(*) INTO v_count FROM fantasy_lineup_slots WHERE fantasy_lineup_id=md5(v_run || ':lineup:1:1')::uuid AND role='STARTER';
    IF v_count<>4 THEN RAISE EXCEPTION '14F draft needs four starters, found %',v_count; END IF;
  END IF;
  IF v_scenario IN ('lineup.locked','round.live','round.finished','round.published','round.corrected','pricing.history','league.activity','account.multi-league') AND (SELECT count(*) FROM fantasy_lineup_slots WHERE fantasy_lineup_id=md5(v_run || ':lineup:1:1')::uuid AND role='STARTER')<>5 THEN RAISE EXCEPTION '14F locked lineup needs five starters'; END IF;
  IF v_scenario IN ('lineup.locked','round.live','round.finished','round.published','round.corrected','pricing.history','league.activity','account.multi-league') AND EXISTS(SELECT 1 FROM fantasy_teams ft WHERE ft.league_id=md5(v_run || ':league')::uuid AND ((SELECT count(*) FROM fantasy_roster_slots rs WHERE rs.fantasy_team_id=ft.id)<>7 OR (SELECT count(*) FROM fantasy_lineups fl JOIN fantasy_lineup_slots fls ON fls.fantasy_lineup_id=fl.id WHERE fl.fantasy_team_id=ft.id AND fl.round_number=1 AND fl.superseded_at IS NULL AND fls.role='STARTER')<>5)) THEN RAISE EXCEPTION '14F every manager needs a complete roster and five starters'; END IF;
  IF v_scenario='round.live' AND EXISTS(SELECT 1 FROM games WHERE competition_season_id=v_cs AND round_number=1 AND status<>'live') THEN RAISE EXCEPTION '14F round.live contains non-live games'; END IF;
  IF v_scenario='round.finished' AND EXISTS(SELECT 1 FROM games WHERE competition_season_id=v_cs AND round_number=1 AND (status<>'finished' OR stats_sync_status<>'stats_final')) THEN RAISE EXCEPTION '14F round.finished is not completely synchronized'; END IF;
  IF v_scenario IN ('pricing.history','league.activity','account.multi-league','round.corrected') AND EXISTS(SELECT 1 FROM player_prices pp WHERE pp.competition_season_id=v_cs AND pp.algorithm_version='canastio-market-v1' AND NOT EXISTS(SELECT 1 FROM player_price_events e WHERE e.player_price_id=pp.id AND e.new_price=pp.current_price)) THEN RAISE EXCEPTION '14F price lacks matching event'; END IF;
  IF v_scenario IN ('pricing.history','league.activity','account.multi-league','round.corrected') AND ((SELECT count(DISTINCT current_price) FROM player_prices WHERE competition_season_id=v_cs AND algorithm_version='canastio-market-v1')<3) THEN RAISE EXCEPTION '14F pricing needs rising, falling and stable players'; END IF;
  IF v_scenario IN ('round.published','round.corrected','pricing.history','league.activity','account.multi-league') AND (SELECT count(*) FROM fantasy_round_scores WHERE fantasy_team_id=v_team AND superseded_at IS NULL AND status='PUBLISHED')<>1 THEN RAISE EXCEPTION '14F needs one current published round score'; END IF;
  IF v_scenario IN ('round.published','round.corrected','pricing.history','league.activity','account.multi-league') AND (SELECT count(*) FROM fantasy_round_scores WHERE league_id=md5(v_run || ':league')::uuid AND superseded_at IS NULL AND status='PUBLISHED')<>{{managers}} THEN RAISE EXCEPTION '14F every manager needs a published round score'; END IF;
  IF v_scenario IN ('round.published','round.corrected','pricing.history','league.activity','account.multi-league') AND (SELECT jsonb_array_length(breakdown->'starters') FROM fantasy_round_scores WHERE fantasy_team_id=v_team AND superseded_at IS NULL AND status='PUBLISHED')<>5 THEN RAISE EXCEPTION '14F published score needs five player contributions'; END IF;
  IF v_scenario IN ('round.published','round.corrected','pricing.history','league.activity','account.multi-league') AND EXISTS(SELECT 1 FROM fantasy_team_totals t WHERE t.fantasy_team_id=v_team AND t.total_points<>(SELECT sum(s.points) FROM fantasy_round_scores s WHERE s.fantasy_team_id=v_team AND s.status='PUBLISHED' AND s.superseded_at IS NULL)) THEN RAISE EXCEPTION '14F team total mismatch'; END IF;
  IF v_scenario IN ('round.published','round.corrected','pricing.history','league.activity','account.multi-league') AND (SELECT count(*) FROM fantasy_team_totals t JOIN fantasy_teams ft ON ft.id=t.fantasy_team_id WHERE ft.league_id=md5(v_run || ':league')::uuid)<>(SELECT count(*) FROM fantasy_teams WHERE league_id=md5(v_run || ':league')::uuid) THEN RAISE EXCEPTION '14F ranking does not cover every league team'; END IF;
  IF v_scenario='round.corrected' AND (SELECT count(*) FROM fantasy_round_scores WHERE fantasy_team_id=v_team AND round_number=1)<2 THEN RAISE EXCEPTION '14F correction did not preserve revision history'; END IF;
  IF v_scenario='round.corrected' AND NOT EXISTS(SELECT 1 FROM player_price_events WHERE competition_season_id=v_cs AND round_number=1 GROUP BY player_price_id HAVING count(*)>=2) THEN RAISE EXCEPTION '14F correction did not preserve and republish a price revision'; END IF;
  IF v_scenario='league.activity' AND ((SELECT count(*) FROM market_transactions WHERE league_id=md5(v_run || ':league')::uuid)=0 OR (SELECT count(*) FROM player_price_events WHERE competition_season_id=v_cs)=0 OR (SELECT count(*) FROM fantasy_round_scores WHERE league_id=md5(v_run || ':league')::uuid AND status='PUBLISHED')=0 OR (SELECT count(*) FROM league_memberships WHERE league_id=md5(v_run || ':league')::uuid AND status='ACTIVE')<>{{managers}}) THEN RAISE EXCEPTION '14F activity sources are incomplete'; END IF;
  IF v_scenario='account.multi-league' AND (SELECT count(*) FROM fantasy_teams WHERE user_profile_id=(SELECT id FROM user_profiles WHERE auth_user_id=COALESCE((SELECT (x->>'authUserId')::uuid FROM jsonb_array_elements({{identity_map}}::jsonb) x WHERE x->>'slot'='01'),md5(v_run || ':auth:1')::uuid)))<>2 THEN RAISE EXCEPTION '14F multi-league isolation fixture missing'; END IF;
END $$;
