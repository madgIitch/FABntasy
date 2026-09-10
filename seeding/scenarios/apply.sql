-- Deterministic overlay shared by the canonical 14F scenarios.
BEGIN;
DO $$
DECLARE
  v_run text := {{run_id}};
  v_scenario text := {{scenario}};
  v_clock timestamptz := {{clock}};
  v_cs uuid := md5(v_run || ':competition-season')::uuid;
  v_league uuid := md5(v_run || ':league')::uuid;
  v_team uuid := md5(v_run || ':fantasy-team:1')::uuid;
  v_lineup uuid := md5(v_run || ':lineup:1:1')::uuid;
  v_scoring uuid := md5(v_run || ':scoring-rule')::uuid;
  v_row record;
  v_roster integer := 0;
  v_lineup_size integer := 0;
  v_balance bigint := 100000000;
  v_locked boolean := false;
  i integer := 0;
  v_owner_profile uuid;
  v_manager_team uuid;
  v_manager_lineup uuid;
  v_manager_balance bigint;
  v_manager_no integer;
  v_player_no integer;
BEGIN
  SELECT id INTO v_owner_profile FROM user_profiles WHERE auth_user_id=COALESCE((SELECT (x->>'authUserId')::uuid FROM jsonb_array_elements({{identity_map}}::jsonb) x WHERE x->>'slot'='01'),md5(v_run || ':auth:1')::uuid);
  IF v_scenario IN ('round.live','round.finished','round.published','round.corrected','pricing.history','league.activity','account.multi-league') THEN
    UPDATE fantasy_scoring_rule_sets
    SET status='ACTIVE',published_at=COALESCE(published_at,v_clock),updated_at=v_clock
    WHERE id=v_scoring;
  END IF;
  IF v_scenario IN ('market.partial-roster','market.operations','market.rejections') THEN v_roster:=2; END IF;
  IF v_scenario IN ('lineup.draft','lineup.locked','round.live','round.finished','round.published','round.corrected','pricing.history','league.activity','account.multi-league') THEN v_roster:=7; END IF;
  IF v_scenario='lineup.draft' THEN v_lineup_size:=4; END IF;
  IF v_scenario IN ('lineup.locked','round.live','round.finished','round.published','round.corrected','pricing.history','league.activity','account.multi-league') THEN v_lineup_size:=7; v_locked:=true; END IF;

  FOR v_row IN
    SELECT pr.id FROM player_registrations pr
    JOIN team_registrations tr ON tr.id=pr.team_registration_id
    WHERE pr.competition_season_id=v_cs
    ORDER BY pr.shirt_number::int,tr.team_id,pr.id LIMIT v_roster
  LOOP
    i:=i+1; v_balance:=v_balance-5000000;
    INSERT INTO market_transactions(id,league_id,player_registration_id,buyer_team_id,transaction_type,price_credits,market_price_credits,round_number,idempotency_key,created_at)
    VALUES(md5(v_run || ':buy:' || i)::uuid,v_league,v_row.id,v_team,'BUY',5000000,5000000,1,v_run || ':buy:' || i,v_clock+(i*interval '1 minute')) ON CONFLICT(id) DO NOTHING;
    INSERT INTO fantasy_roster_slots(id,fantasy_team_id,league_id,player_registration_id,acquisition_price,created_at)
    VALUES(md5(v_run || ':slot:' || i)::uuid,v_team,v_league,v_row.id,5000000,v_clock+(i*interval '1 minute')) ON CONFLICT(id) DO NOTHING;
    INSERT INTO fantasy_budget_ledger(id,fantasy_team_id,league_id,transaction_id,entry_type,amount_credits,balance_after,created_at)
    VALUES(md5(v_run || ':buy-ledger:' || i)::uuid,v_team,v_league,md5(v_run || ':buy:' || i)::uuid,'BUY',-5000000,v_balance,v_clock+(i*interval '1 minute')) ON CONFLICT(id) DO NOTHING;
  END LOOP;
  UPDATE fantasy_teams SET balance_credits=v_balance,version=1+v_roster,updated_at=v_clock WHERE id=v_team AND v_roster>0;

  IF v_lineup_size>0 THEN
    INSERT INTO fantasy_lineups(id,fantasy_team_id,round_number,revision,status,cutoff_at,locked_at,created_at)
    VALUES(v_lineup,v_team,1,1,CASE WHEN v_locked THEN 'LOCKED' ELSE 'DRAFT' END,v_clock+interval '1 day',CASE WHEN v_locked THEN v_clock ELSE NULL END,v_clock)
    ON CONFLICT(id) DO UPDATE SET status=excluded.status,locked_at=excluded.locked_at;
    INSERT INTO fantasy_lineup_slots(id,fantasy_lineup_id,player_registration_id,role,ordinal,player_id_snapshot,display_name_snapshot,real_team_id_snapshot,real_team_name_snapshot,acquisition_price,market_price_snapshot)
    SELECT md5(v_run || ':lineup-slot:' || row_number() OVER(ORDER BY rs.created_at,rs.id))::uuid,v_lineup,rs.player_registration_id,
      CASE WHEN row_number() OVER(ORDER BY rs.created_at,rs.id)<=least(5,v_lineup_size) THEN 'STARTER' ELSE 'SUBSTITUTE' END,
      CASE WHEN row_number() OVER(ORDER BY rs.created_at,rs.id)<=least(5,v_lineup_size) THEN row_number() OVER(ORDER BY rs.created_at,rs.id)-1 ELSE row_number() OVER(ORDER BY rs.created_at,rs.id)-6 END,
      pr.player_id,p.display_name,tr.team_id,t.name,rs.acquisition_price,5000000
    FROM fantasy_roster_slots rs JOIN player_registrations pr ON pr.id=rs.player_registration_id JOIN players p ON p.id=pr.player_id
    JOIN team_registrations tr ON tr.id=pr.team_registration_id JOIN teams t ON t.id=tr.team_id
      WHERE rs.fantasy_team_id=v_team ORDER BY rs.created_at,rs.id LIMIT v_lineup_size ON CONFLICT DO NOTHING;

    -- Once lineups are locked, every manager owns a distinct, rule-compliant roster and lineup.
    IF v_locked THEN
    FOR v_manager_no IN 2..{{managers}} LOOP
      v_manager_team:=md5(v_run || ':fantasy-team:' || v_manager_no)::uuid;
      v_manager_lineup:=md5(v_run || ':lineup:' || v_manager_no || ':1')::uuid;
      v_manager_balance:=100000000;
      v_player_no:=0;
      FOR v_row IN
        SELECT ranked.id FROM (
          SELECT pr.id,
            row_number() OVER(ORDER BY pr.shirt_number::int,tr.team_id,pr.id) AS market_ordinal
          FROM player_registrations pr
          JOIN team_registrations tr ON tr.id=pr.team_registration_id
          WHERE pr.competition_season_id=v_cs
        ) ranked
        WHERE ranked.market_ordinal BETWEEN ((v_manager_no-1)*7)+1 AND v_manager_no*7
        ORDER BY ranked.market_ordinal
      LOOP
        v_player_no:=v_player_no+1;
        v_manager_balance:=v_manager_balance-5000000;
        INSERT INTO market_transactions(id,league_id,player_registration_id,buyer_team_id,transaction_type,price_credits,market_price_credits,round_number,idempotency_key,created_at)
        VALUES(md5(v_run || ':buy:' || v_manager_no || ':' || v_player_no)::uuid,v_league,v_row.id,v_manager_team,'BUY',5000000,5000000,1,v_run || ':buy:' || v_manager_no || ':' || v_player_no,v_clock+(v_player_no*interval '1 minute')) ON CONFLICT(id) DO NOTHING;
        INSERT INTO fantasy_roster_slots(id,fantasy_team_id,league_id,player_registration_id,acquisition_price,created_at)
        VALUES(md5(v_run || ':slot:' || v_manager_no || ':' || v_player_no)::uuid,v_manager_team,v_league,v_row.id,5000000,v_clock+(v_player_no*interval '1 minute')) ON CONFLICT(id) DO NOTHING;
        INSERT INTO fantasy_budget_ledger(id,fantasy_team_id,league_id,transaction_id,entry_type,amount_credits,balance_after,created_at)
        VALUES(md5(v_run || ':buy-ledger:' || v_manager_no || ':' || v_player_no)::uuid,v_manager_team,v_league,md5(v_run || ':buy:' || v_manager_no || ':' || v_player_no)::uuid,'BUY',-5000000,v_manager_balance,v_clock+(v_player_no*interval '1 minute')) ON CONFLICT(id) DO NOTHING;
      END LOOP;
      UPDATE fantasy_teams SET balance_credits=v_manager_balance,version=1+v_player_no,updated_at=v_clock WHERE id=v_manager_team;
      INSERT INTO fantasy_lineups(id,fantasy_team_id,round_number,revision,status,cutoff_at,locked_at,created_at)
      VALUES(v_manager_lineup,v_manager_team,1,1,CASE WHEN v_locked THEN 'LOCKED' ELSE 'DRAFT' END,v_clock+interval '1 day',CASE WHEN v_locked THEN v_clock ELSE NULL END,v_clock) ON CONFLICT(id) DO NOTHING;
      INSERT INTO fantasy_lineup_slots(id,fantasy_lineup_id,player_registration_id,role,ordinal,player_id_snapshot,display_name_snapshot,real_team_id_snapshot,real_team_name_snapshot,acquisition_price,market_price_snapshot)
      SELECT md5(v_run || ':lineup-slot:' || v_manager_no || ':' || row_number() OVER(ORDER BY rs.created_at,rs.id))::uuid,v_manager_lineup,rs.player_registration_id,
        CASE WHEN row_number() OVER(ORDER BY rs.created_at,rs.id)<=5 THEN 'STARTER' ELSE 'SUBSTITUTE' END,
        CASE WHEN row_number() OVER(ORDER BY rs.created_at,rs.id)<=5 THEN row_number() OVER(ORDER BY rs.created_at,rs.id)-1 ELSE row_number() OVER(ORDER BY rs.created_at,rs.id)-6 END,
        pr.player_id,p.display_name,tr.team_id,t.name,rs.acquisition_price,5000000
      FROM fantasy_roster_slots rs JOIN player_registrations pr ON pr.id=rs.player_registration_id JOIN players p ON p.id=pr.player_id
      JOIN team_registrations tr ON tr.id=pr.team_registration_id JOIN teams t ON t.id=tr.team_id
      WHERE rs.fantasy_team_id=v_manager_team ORDER BY rs.created_at,rs.id LIMIT 7 ON CONFLICT DO NOTHING;
    END LOOP;
    END IF;
  END IF;

  IF v_scenario IN ('round.live','round.finished','round.published','round.corrected','pricing.history','league.activity','account.multi-league') THEN
    UPDATE games SET status=CASE WHEN v_scenario='round.live' THEN 'live' ELSE 'finished' END,
      source_status=CASE WHEN v_scenario='round.live' THEN 'LIVE' ELSE 'FINAL' END,has_statistics=true,
      stats_sync_status=CASE WHEN v_scenario='round.live' THEN 'partial' ELSE 'stats_final' END,stats_synced_at=v_clock,updated_at=v_clock
    WHERE competition_season_id=v_cs AND round_number=1;
    INSERT INTO player_game_stats(id,game_id,player_registration_id,starter,minutes_played,milliseconds_played,points,free_throws_made,free_throws_attempted,two_pointers_made,two_pointers_attempted,three_pointers_made,three_pointers_attempted,offensive_rebounds,defensive_rebounds,rebounds,assists,steals,turnovers,blocks,blocks_received,fouls_committed,fouls_received,technical_fouls,valuation,plus_minus,created_at,updated_at)
    SELECT md5(v_run || ':stat:' || g.id || ':' || pr.id)::uuid,g.id,pr.id,
      row_number() OVER(PARTITION BY g.id,tr.team_id ORDER BY pr.shirt_number::int,pr.id)<=5,
      round((200.0/{{players_per_team}})::numeric,3),round((12000000.0/{{players_per_team}}))::int,
      6+(3*(pr.shirt_number::int%3)),2,2,2,4,(pr.shirt_number::int%3),3,1,3,4,2,1,1,0,0,2,2,0,10+(pr.shirt_number::int%9),0,v_clock,v_clock
    FROM games g JOIN team_registrations tr ON tr.competition_season_id=v_cs AND tr.team_id IN(g.home_team_id,g.away_team_id)
    JOIN player_registrations pr ON pr.team_registration_id=tr.id
    WHERE g.competition_season_id=v_cs AND g.round_number=1 ON CONFLICT(id) DO NOTHING;
    UPDATE games g SET
      home_score=(SELECT coalesce(sum(pgs.points),0) FROM player_game_stats pgs JOIN player_registrations pr ON pr.id=pgs.player_registration_id JOIN team_registrations tr ON tr.id=pr.team_registration_id WHERE pgs.game_id=g.id AND tr.team_id=g.home_team_id),
      away_score=(SELECT coalesce(sum(pgs.points),0) FROM player_game_stats pgs JOIN player_registrations pr ON pr.id=pgs.player_registration_id JOIN team_registrations tr ON tr.id=pr.team_registration_id WHERE pgs.game_id=g.id AND tr.team_id=g.away_team_id)
    WHERE g.competition_season_id=v_cs AND g.round_number=1;
  END IF;

  IF v_scenario IN ('pricing.history','league.activity','account.multi-league','round.corrected') THEN
    INSERT INTO player_price_events(id,player_price_id,player_registration_id,competition_season_id,round_number,algorithm_version,input_revision,status,previous_price,target_price,new_price,recent_form,season_average,market_rating,percentile,dnp_streak,input_snapshot,created_at)
    SELECT md5(v_run || ':price-event:' || pp.id)::uuid,pp.id,pp.player_registration_id,v_cs,1,'canastio-market-v1',md5(v_run || ':pv1:' || pp.id)||md5(v_run || ':pv2:' || pp.id),'APPLIED',5000000,
      CASE (pr.shirt_number::int%3) WHEN 0 THEN 5600000 WHEN 1 THEN 4500000 ELSE 5000000 END,
      CASE (pr.shirt_number::int%3) WHEN 0 THEN 5600000 WHEN 1 THEN 4500000 ELSE 5000000 END,
      CASE (pr.shirt_number::int%3) WHEN 0 THEN 14 WHEN 1 THEN 6 ELSE 10 END,10,10,0.5,0,'{"synthetic":true}'::jsonb,v_clock
    FROM player_prices pp JOIN player_registrations pr ON pr.id=pp.player_registration_id
    WHERE pp.competition_season_id=v_cs AND pp.algorithm_version='canastio-market-v1' ON CONFLICT(id) DO NOTHING;
    UPDATE player_prices pp SET current_price=CASE (pr.shirt_number::int%3) WHEN 0 THEN 5600000 WHEN 1 THEN 4500000 ELSE 5000000 END,
      last_round_number=1,all_time_high=greatest(5000000,CASE (pr.shirt_number::int%3) WHEN 0 THEN 5600000 WHEN 1 THEN 4500000 ELSE 5000000 END),
      all_time_low=least(5000000,CASE (pr.shirt_number::int%3) WHEN 0 THEN 5600000 WHEN 1 THEN 4500000 ELSE 5000000 END),updated_at=v_clock
    FROM player_registrations pr WHERE pp.player_registration_id=pr.id AND pp.competition_season_id=v_cs AND pp.algorithm_version='canastio-market-v1';
  END IF;

  IF v_scenario IN ('round.published','round.corrected','pricing.history','league.activity','account.multi-league') THEN
    INSERT INTO fantasy_player_game_scores(id,player_game_stat_id,player_id,game_id,rule_set_id,rule_set_version,source_stats_version,raw_score,normalized_fantasy_points,status,breakdown,created_at,updated_at)
    SELECT md5(v_run || ':fantasy-stat:' || pgs.id)::uuid,pgs.id,pr.player_id,pgs.game_id,v_scoring,'1.0.0',md5(v_run || ':stats-input:1:' || pgs.id)||md5(v_run || ':stats-input:2:' || pgs.id),pgs.valuation,pgs.valuation,'CALCULATED','{"synthetic":true}'::jsonb,v_clock,v_clock
    FROM player_game_stats pgs JOIN player_registrations pr ON pr.id=pgs.player_registration_id JOIN games g ON g.id=pgs.game_id
    WHERE g.competition_season_id=v_cs AND g.round_number=1 ON CONFLICT(id) DO NOTHING;
    INSERT INTO fantasy_round_scores(id,fantasy_team_id,league_id,competition_season_id,round_number,revision,lineup_id,rule_set_id,input_revision,status,points,breakdown,published_at,created_at)
    SELECT md5(v_run || ':round-score:1')::uuid,v_team,v_league,v_cs,1,1,v_lineup,v_scoring,md5(v_run || ':score-input:1')||md5(v_run || ':score-input:1b'),'PUBLISHED',
      sum(fpgs.normalized_fantasy_points),
      jsonb_build_object('synthetic',true,'starters',jsonb_agg(jsonb_build_object(
        'playerRegistrationId',fls.player_registration_id::text,
        'displayName',fls.display_name_snapshot,
        'points',fpgs.normalized_fantasy_points::text,
        'status',fpgs.status
      ) ORDER BY fls.ordinal)),v_clock,v_clock
    FROM fantasy_lineup_slots fls JOIN player_registrations pr ON pr.id=fls.player_registration_id
    JOIN fantasy_player_game_scores fpgs ON fpgs.player_id=pr.player_id AND fpgs.rule_set_id=v_scoring
    JOIN games g ON g.id=fpgs.game_id AND g.round_number=1
    WHERE fls.fantasy_lineup_id=v_lineup AND fls.role='STARTER'
    ON CONFLICT(id) DO NOTHING;
    INSERT INTO fantasy_round_scores(id,fantasy_team_id,league_id,competition_season_id,round_number,revision,lineup_id,rule_set_id,input_revision,status,points,breakdown,published_at,created_at)
    SELECT md5(v_run || ':round-score:' || fl.fantasy_team_id::text)::uuid,fl.fantasy_team_id,v_league,v_cs,1,1,fl.id,v_scoring,
      md5(v_run || ':score-input:' || fl.fantasy_team_id::text)||md5(v_run || ':score-input-b:' || fl.fantasy_team_id::text),'PUBLISHED',
      sum(fpgs.normalized_fantasy_points),jsonb_build_object('synthetic',true,'starters',jsonb_agg(jsonb_build_object(
        'playerRegistrationId',fls.player_registration_id::text,'displayName',fls.display_name_snapshot,
        'points',fpgs.normalized_fantasy_points::text,'status',fpgs.status) ORDER BY fls.ordinal)),v_clock,v_clock
    FROM fantasy_lineups fl
    JOIN fantasy_lineup_slots fls ON fls.fantasy_lineup_id=fl.id AND fls.role='STARTER'
    JOIN player_registrations pr ON pr.id=fls.player_registration_id
    JOIN fantasy_player_game_scores fpgs ON fpgs.player_id=pr.player_id AND fpgs.rule_set_id=v_scoring
    JOIN games g ON g.id=fpgs.game_id AND g.round_number=1
    WHERE fl.fantasy_team_id<>v_team AND fl.round_number=1 AND fl.superseded_at IS NULL
      AND fl.fantasy_team_id IN(SELECT id FROM fantasy_teams WHERE league_id=v_league)
    GROUP BY fl.id,fl.fantasy_team_id
    ON CONFLICT(id) DO NOTHING;
    INSERT INTO fantasy_team_totals(id,fantasy_team_id,league_id,competition_season_id,total_points,last_round_number,last_round_points,best_round_points,global_position,league_position,updated_at)
    SELECT md5(v_run || ':team-total:' || ranked.fantasy_team_id::text)::uuid,ranked.fantasy_team_id,v_league,v_cs,ranked.points,1,ranked.points,ranked.points,ranked.position,ranked.position,v_clock
    FROM (
      SELECT frs.fantasy_team_id,frs.points,row_number() OVER(ORDER BY frs.points DESC,ft.created_at,ft.id) AS position
      FROM fantasy_round_scores frs JOIN fantasy_teams ft ON ft.id=frs.fantasy_team_id
      WHERE frs.league_id=v_league AND frs.round_number=1 AND frs.status='PUBLISHED' AND frs.superseded_at IS NULL
    ) ranked
    ON CONFLICT(fantasy_team_id) DO UPDATE SET total_points=excluded.total_points,last_round_number=1,last_round_points=excluded.last_round_points,best_round_points=excluded.best_round_points,global_position=excluded.global_position,league_position=excluded.league_position,updated_at=excluded.updated_at;
  END IF;

  IF v_scenario='round.corrected' THEN
    UPDATE fantasy_round_scores SET superseded_at=v_clock+interval '1 hour' WHERE id=md5(v_run || ':round-score:1')::uuid;
    INSERT INTO fantasy_round_scores(id,fantasy_team_id,league_id,competition_season_id,round_number,revision,lineup_id,rule_set_id,input_revision,status,points,breakdown,published_at,created_at)
    SELECT md5(v_run || ':round-score:2')::uuid,v_team,v_league,v_cs,1,2,v_lineup,v_scoring,md5(v_run || ':score-input:2')||md5(v_run || ':score-input:2b'),'PUBLISHED',points+1,breakdown || '{"corrected":true}'::jsonb,v_clock+interval '1 hour',v_clock+interval '1 hour'
    FROM fantasy_round_scores WHERE id=md5(v_run || ':round-score:1')::uuid
    ON CONFLICT(id) DO NOTHING;
    UPDATE fantasy_team_totals SET total_points=current_score.points,last_round_points=current_score.points,best_round_points=current_score.points,updated_at=v_clock+interval '1 hour'
    FROM fantasy_round_scores current_score WHERE fantasy_team_totals.fantasy_team_id=v_team AND current_score.id=md5(v_run || ':round-score:2')::uuid;
    WITH positions AS (
      SELECT id,row_number() OVER(ORDER BY total_points DESC,updated_at,id) AS position
      FROM fantasy_team_totals WHERE league_id=v_league
    )
    UPDATE fantasy_team_totals totals SET global_position=positions.position,league_position=positions.position
    FROM positions WHERE totals.id=positions.id;
    INSERT INTO player_price_events(id,player_price_id,player_registration_id,competition_season_id,round_number,algorithm_version,input_revision,status,previous_price,target_price,new_price,recent_form,season_average,market_rating,percentile,dnp_streak,input_snapshot,created_at)
    SELECT md5(v_run || ':corrected-price-event:' || pp.id)::uuid,pp.id,pp.player_registration_id,v_cs,1,'canastio-market-v1',
      md5(v_run || ':corrected-pv1:' || pp.id)||md5(v_run || ':corrected-pv2:' || pp.id),'APPLIED',pp.current_price,pp.current_price+100000,pp.current_price+100000,15,11,14,0.75,0,'{"synthetic":true,"corrected":true}'::jsonb,v_clock+interval '1 hour'
    FROM player_prices pp JOIN fantasy_roster_slots rs ON rs.player_registration_id=pp.player_registration_id AND rs.fantasy_team_id=v_team
    ORDER BY rs.created_at,rs.id LIMIT 1 ON CONFLICT(id) DO NOTHING;
    UPDATE player_prices pp SET current_price=event.new_price,all_time_high=greatest(pp.all_time_high,event.new_price),last_round_number=1,updated_at=v_clock+interval '1 hour'
    FROM player_price_events event WHERE event.id=md5(v_run || ':corrected-price-event:' || pp.id)::uuid;
  END IF;

  IF v_scenario='account.multi-league' THEN
    INSERT INTO fantasy_leagues(id,competition_season_id,owner_profile_id,name,league_code,status,member_limit,version,created_at,updated_at)
    VALUES(md5(v_run || ':league:2')::uuid,v_cs,v_owner_profile,'Liga Secundaria ' || v_run,'S'||upper(substr(md5(v_run),1,8)),'ACTIVE',20,1,v_clock,v_clock) ON CONFLICT(id) DO NOTHING;
    INSERT INTO league_memberships(id,league_id,user_profile_id,role,status,joined_at)
    VALUES(md5(v_run || ':membership:secondary')::uuid,md5(v_run || ':league:2')::uuid,v_owner_profile,'OWNER','ACTIVE',v_clock) ON CONFLICT(id) DO NOTHING;
    INSERT INTO fantasy_teams(id,name,user_profile_id,competition_season_id,roster_rule_set_id,league_id,version,balance_credits,created_at,updated_at)
    VALUES(md5(v_run || ':fantasy-team:secondary')::uuid,'Equipo Secundario',v_owner_profile,v_cs,md5(v_run || ':roster-rule')::uuid,md5(v_run || ':league:2')::uuid,1,100000000,v_clock,v_clock) ON CONFLICT(id) DO NOTHING;
    INSERT INTO fantasy_budget_ledger(id,fantasy_team_id,league_id,entry_type,amount_credits,balance_after,created_at)
    VALUES(md5(v_run || ':initial-ledger:secondary')::uuid,md5(v_run || ':fantasy-team:secondary')::uuid,md5(v_run || ':league:2')::uuid,'INITIAL_BALANCE',100000000,100000000,v_clock) ON CONFLICT(id) DO NOTHING;
  END IF;
END $$;
COMMIT;
