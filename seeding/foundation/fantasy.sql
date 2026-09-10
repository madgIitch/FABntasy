-- 14F deterministic identities, league, teams, prices and initial ledgers.
BEGIN;
DO $$
DECLARE
  v_run text := {{run_id}};
  v_clock timestamptz := {{clock}};
  v_cs uuid := md5(v_run || ':competition-season')::uuid;
  v_rule uuid := md5(v_run || ':roster-rule')::uuid;
  v_scoring uuid := md5(v_run || ':scoring-rule')::uuid;
  v_league uuid := md5(v_run || ':league')::uuid;
  v_profile uuid;
  v_auth uuid;
  v_team uuid;
  v_identities jsonb := {{identity_map}}::jsonb;
  v_username text;
  i integer;
BEGIN
  INSERT INTO fantasy_roster_rule_sets(id,competition_season_id,identifier,version,budget_credits,roster_size,starter_count,substitute_count,max_per_real_team,position_limits,cold_start_price_credits,status,created_at)
  VALUES(v_rule,v_cs,'14f-' || v_run,'1.0.0',100000000,7,5,2,2,'{}'::jsonb,5000000,'ACTIVE',v_clock)
  ON CONFLICT(id) DO NOTHING;

  INSERT INTO fantasy_scoring_rule_sets(id,competition_season_id,identifier,version,calculation_type,status,definition,published_at,created_at,updated_at)
  VALUES(
    v_scoring,v_cs,'canastio.provincial.player-game','1.0.0','PROVINCIAL','DRAFT',
    '{
      "identifier":"canastio.provincial.player-game",
      "version":"1.0.0",
      "calculationType":"PROVINCIAL",
      "formula":"PTS + 0.50*3PM + 0.25*FTM - 0.50*FC",
      "terms":[
        {"id":"points","label":"Puntos","expression":"PTS","inputs":["points"],"coefficient":"1","required":true},
        {"id":"three-pointers","label":"Triples anotados","expression":"3PM","inputs":["threePointersMade"],"coefficient":"0.50","required":true},
        {"id":"free-throws","label":"Tiros libres anotados","expression":"FTM","inputs":["freeThrowsMade"],"coefficient":"0.25","required":true},
        {"id":"fouls","label":"Faltas cometidas","expression":"FC","inputs":["foulsCommitted"],"coefficient":"-0.50","required":true}
      ],
      "bonuses":[],
      "nullPolicy":"REJECT_REQUIRED",
      "dnpPolicy":"ZERO_MINUTES_ALL_STATS_ZERO",
      "allowNegativeRaw":true,
      "rounding":{"mode":"HALF_UP","scale":1,"stage":"FINAL_ONLY"},
      "normalization":{"minimumSample":20,"method":"POPULATION_Z_SCORE","base":"20","factor":"10","minimum":"0","maximum":"50"}
    }'::jsonb,
    NULL,v_clock,v_clock
  )
  ON CONFLICT(id) DO UPDATE SET
    identifier=excluded.identifier,
    version=excluded.version,
    calculation_type=excluded.calculation_type,
    definition=excluded.definition,
    status='DRAFT',
    published_at=NULL,
    updated_at=excluded.updated_at;

  -- Profile 0 is intentionally left without a league for onboarding.no-league.
  FOR i IN 0..{{managers}} LOOP
    v_auth := COALESCE((SELECT (x->>'authUserId')::uuid FROM jsonb_array_elements(v_identities) x WHERE x->>'slot'=lpad(i::text,2,'0')),md5(v_run || ':auth:' || i)::uuid);
    v_username := COALESCE((SELECT x->>'username' FROM jsonb_array_elements(v_identities) x WHERE x->>'slot'=lpad(i::text,2,'0')),'u_' || substr(md5(v_run),1,6) || '_' || lpad(i::text,3,'0'));
    IF jsonb_array_length(v_identities)>0 THEN
      SELECT id INTO v_profile FROM user_profiles WHERE auth_user_id=v_auth;
      IF v_profile IS NULL THEN RAISE EXCEPTION '14F Supabase profile missing for slot %',i; END IF;
      UPDATE user_profiles SET username=v_username,display_name='Usuario Sintético ' || lpad(i::text,3,'0'),updated_at=v_clock WHERE id=v_profile;
    ELSE
      v_profile := md5(v_run || ':profile:' || i)::uuid;
      INSERT INTO auth.users(id,raw_user_meta_data,created_at) VALUES(v_auth,jsonb_build_object('username',v_username),v_clock) ON CONFLICT(id) DO NOTHING;
      UPDATE user_profiles SET id=v_profile,username=v_username,display_name='Usuario Sintético ' || lpad(i::text,3,'0'),updated_at=v_clock WHERE auth_user_id=v_auth AND id<>v_profile;
      INSERT INTO user_profiles(id,auth_user_id,username,display_name,created_at,updated_at) VALUES(v_profile,v_auth,v_username,'Usuario Sintético ' || lpad(i::text,3,'0'),v_clock,v_clock)
      ON CONFLICT(auth_user_id) DO UPDATE SET username=excluded.username,display_name=excluded.display_name,updated_at=excluded.updated_at;
    END IF;
  END LOOP;

  INSERT INTO fantasy_leagues(id,competition_season_id,owner_profile_id,name,league_code,password_hash,status,member_limit,version,created_at,updated_at)
  VALUES(v_league,v_cs,(SELECT id FROM user_profiles WHERE auth_user_id=COALESCE((SELECT (x->>'authUserId')::uuid FROM jsonb_array_elements(v_identities) x WHERE x->>'slot'='01'),md5(v_run || ':auth:1')::uuid)),'Liga Sintética ' || v_run,'T' || upper(substr(md5(v_run),1,8)),NULL,'ACTIVE',greatest(20,{{managers}}),1,v_clock,v_clock)
  ON CONFLICT(id) DO NOTHING;

  FOR i IN 1..{{managers}} LOOP
    SELECT id INTO v_profile FROM user_profiles WHERE auth_user_id=COALESCE((SELECT (x->>'authUserId')::uuid FROM jsonb_array_elements(v_identities) x WHERE x->>'slot'=lpad(i::text,2,'0')),md5(v_run || ':auth:' || i)::uuid);
    v_team := md5(v_run || ':fantasy-team:' || i)::uuid;
    INSERT INTO league_memberships(id,league_id,user_profile_id,role,status,joined_at)
    VALUES(md5(v_run || ':membership:' || i)::uuid,v_league,v_profile,CASE WHEN i=1 THEN 'OWNER' ELSE 'MEMBER' END,'ACTIVE',v_clock + (i*interval '1 minute'))
    ON CONFLICT(id) DO NOTHING;
    INSERT INTO fantasy_teams(id,name,user_profile_id,competition_season_id,roster_rule_set_id,league_id,version,balance_credits,created_at,updated_at)
    VALUES(v_team,'Equipo ' || lpad(i::text,3,'0'),v_profile,v_cs,v_rule,v_league,1,100000000,v_clock,v_clock)
    ON CONFLICT(id) DO NOTHING;
    INSERT INTO fantasy_budget_ledger(id,fantasy_team_id,league_id,transaction_id,entry_type,amount_credits,balance_after,created_at)
    VALUES(md5(v_run || ':initial-ledger:' || i)::uuid,v_team,v_league,NULL,'INITIAL_BALANCE',100000000,100000000,v_clock)
    ON CONFLICT(id) DO NOTHING;
  END LOOP;

  INSERT INTO player_prices(id,player_registration_id,competition_season_id,algorithm_version,current_price,status,last_round_number,all_time_high,all_time_low,created_at,updated_at)
  SELECT md5(v_run || ':price:' || pr.id)::uuid,pr.id,v_cs,'canastio-market-v1',5000000,'PROVISIONAL',NULL,5000000,5000000,v_clock,v_clock
  FROM player_registrations pr WHERE pr.competition_season_id=v_cs
  ON CONFLICT(id) DO UPDATE SET algorithm_version=excluded.algorithm_version,current_price=excluded.current_price,status=excluded.status,updated_at=excluded.updated_at;
END $$;
COMMIT;
