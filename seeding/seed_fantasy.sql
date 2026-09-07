-- Fantasy companion seed for CANASTIO DEV SEED.
-- Prerequisites: seeder.sql, generate_random_games.sql, migrations through Sprint 14.
-- Additive and idempotent: it never deletes user-owned fantasy data.
BEGIN;

DO $$
DECLARE
  cs uuid;
  scoring_rules uuid;
  team_row record;
  round_no int;
  lineup_id uuid;
  cutoff timestamptz;
BEGIN
  SELECT x.id INTO STRICT cs
  FROM competition_seasons x
  JOIN competitions c ON c.id=x.competition_id
  JOIN federations f ON f.id=c.federation_id
  WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES';

  SELECT id INTO scoring_rules FROM fantasy_scoring_rule_sets
  WHERE competition_season_id=cs AND calculation_type='PROVINCIAL' AND status='ACTIVE'
  ORDER BY published_at DESC LIMIT 1;

  IF scoring_rules IS NULL THEN
    INSERT INTO fantasy_scoring_rule_sets(
      id,competition_season_id,identifier,version,calculation_type,status,definition,published_at,created_at,updated_at
    ) VALUES(
      gen_random_uuid(),cs,'canastio-dev-seed','1.0.0','PROVINCIAL','ACTIVE',
      '{"schemaVersion":"fantasy-ruleset.v1","seed":true,"description":"DEV seed uses boxscore valuation as fantasy points"}'::jsonb,
      now(),now(),now()
    ) RETURNING id INTO scoring_rules;
    INSERT INTO fantasy_rule_set_activations(id,competition_season_id,rule_set_id,action,actor,reason,occurred_at)
    VALUES(gen_random_uuid(),cs,scoring_rules,'ACTIVATED','seed_fantasy.sql','Activate deterministic DEV fantasy seed',now());
  END IF;

  -- Complete empty DEV rosters with seven registrations: at most two per real team.
  FOR team_row IN SELECT ft.id,ft.league_id FROM fantasy_teams ft WHERE ft.competition_season_id=cs LOOP
    IF NOT EXISTS(SELECT 1 FROM fantasy_roster_slots WHERE fantasy_team_id=team_row.id) THEN
      INSERT INTO fantasy_roster_slots(id,fantasy_team_id,league_id,player_registration_id,acquisition_price,created_at)
      SELECT gen_random_uuid(),team_row.id,team_row.league_id,picked.id,3000000,now()
      FROM (
        SELECT id FROM (
          SELECT pr.id,tr.team_id,
            row_number() OVER(PARTITION BY tr.team_id ORDER BY pr.shirt_number::int,pr.id) AS team_pos,
            dense_rank() OVER(ORDER BY tr.team_id) AS team_order
          FROM player_registrations pr
          JOIN team_registrations tr ON tr.id=pr.team_registration_id
          WHERE pr.competition_season_id=cs
            AND NOT EXISTS(SELECT 1 FROM fantasy_roster_slots used WHERE used.league_id=team_row.league_id AND used.player_registration_id=pr.id)
        ) candidates
        WHERE team_pos<=2
        ORDER BY team_order,team_pos
        LIMIT 7
      ) picked;
    END IF;

    IF (SELECT count(*) FROM fantasy_roster_slots WHERE fantasy_team_id=team_row.id)<>7 THEN
      RAISE NOTICE 'Equipo fantasy % omitido: necesita exactamente 7 jugadores.',team_row.id;
      CONTINUE;
    END IF;

    FOR round_no IN 1..6 LOOP
      SELECT min(scheduled_at) INTO cutoff FROM games WHERE competition_season_id=cs AND round_number=round_no AND sync_status='active';
      SELECT id INTO lineup_id FROM fantasy_lineups WHERE fantasy_team_id=team_row.id AND round_number=round_no AND superseded_at IS NULL LIMIT 1;
      IF lineup_id IS NULL THEN
        lineup_id:=gen_random_uuid();
        INSERT INTO fantasy_lineups(id,fantasy_team_id,round_number,revision,status,cutoff_at,locked_at,created_at)
        VALUES(lineup_id,team_row.id,round_no,1,'LOCKED',cutoff,cutoff,now());
        INSERT INTO fantasy_lineup_slots(id,fantasy_lineup_id,player_registration_id,role,ordinal,player_id_snapshot,display_name_snapshot,real_team_id_snapshot,real_team_name_snapshot,acquisition_price,market_price_snapshot)
        SELECT gen_random_uuid(),lineup_id,rs.player_registration_id,
          CASE WHEN row_number() OVER(ORDER BY rs.created_at,rs.id)<=5 THEN 'STARTER' ELSE 'SUBSTITUTE' END,
          CASE WHEN row_number() OVER(ORDER BY rs.created_at,rs.id)<=5 THEN row_number() OVER(ORDER BY rs.created_at,rs.id)-1 ELSE row_number() OVER(ORDER BY rs.created_at,rs.id)-6 END,
          pr.player_id,p.display_name,tr.team_id,t.name,rs.acquisition_price,
          (SELECT pp.current_price FROM player_prices pp WHERE pp.player_registration_id=pr.id AND pp.competition_season_id=cs ORDER BY pp.updated_at DESC LIMIT 1)
        FROM fantasy_roster_slots rs
        JOIN player_registrations pr ON pr.id=rs.player_registration_id
        JOIN players p ON p.id=pr.player_id
        JOIN team_registrations tr ON tr.id=pr.team_registration_id
        JOIN teams t ON t.id=tr.team_id
        WHERE rs.fantasy_team_id=team_row.id
        ORDER BY rs.created_at,rs.id;
      END IF;
    END LOOP;
  END LOOP;

  -- Deterministic player scores: official valuation, with confirmed zero-minute players as DNP.
  INSERT INTO fantasy_player_game_scores(id,player_game_stat_id,player_id,game_id,rule_set_id,rule_set_version,source_stats_version,raw_score,normalized_fantasy_points,status,error_code,breakdown,created_at,updated_at)
  SELECT gen_random_uuid(),pgs.id,pr.player_id,pgs.game_id,scoring_rules,'1.0.0',
    encode(digest(concat_ws('|',pgs.id::text,pgs.updated_at::text,coalesce(pgs.valuation,0)::text),'sha256'),'hex'),
    coalesce(pgs.valuation,0),CASE WHEN coalesce(pgs.milliseconds_played,0)=0 THEN 0 ELSE coalesce(pgs.valuation,0) END,
    CASE WHEN coalesce(pgs.milliseconds_played,0)=0 THEN 'DNP' ELSE 'CALCULATED' END,NULL,
    jsonb_build_object('schemaVersion','fantasy-score-breakdown.v1','seed',true,'formula','valoración FAB','rawTerms','[]'::jsonb,'normalization',jsonb_build_object('kind','none'),'finalScore',jsonb_build_object('value',coalesce(pgs.valuation,0))),now(),now()
  FROM player_game_stats pgs
  JOIN player_registrations pr ON pr.id=pgs.player_registration_id
  JOIN games g ON g.id=pgs.game_id
  WHERE g.competition_season_id=cs
  ON CONFLICT(player_game_stat_id,rule_set_id,source_stats_version) DO NOTHING;

  -- Publish one auditable score per locked lineup and round.
  INSERT INTO fantasy_round_scores(id,fantasy_team_id,league_id,competition_season_id,round_number,revision,lineup_id,rule_set_id,input_revision,status,points,breakdown,published_at,created_at)
  SELECT gen_random_uuid(),fl.fantasy_team_id,ft.league_id,cs,fl.round_number,1,fl.id,scoring_rules,
    encode(digest(concat_ws('|',fl.id::text,string_agg(fpgs.id::text,',' ORDER BY fls.ordinal)),'sha256'),'hex'),
    'PUBLISHED',sum(fpgs.normalized_fantasy_points),
    jsonb_build_object('starters',jsonb_agg(jsonb_build_object('playerRegistrationId',fls.player_registration_id,'displayName',fls.display_name_snapshot,'points',fpgs.normalized_fantasy_points::text,'status',fpgs.status) ORDER BY fls.ordinal)),now(),now()
  FROM fantasy_lineups fl
  JOIN fantasy_teams ft ON ft.id=fl.fantasy_team_id
  JOIN fantasy_lineup_slots fls ON fls.fantasy_lineup_id=fl.id AND fls.role='STARTER'
  JOIN player_registrations pr ON pr.id=fls.player_registration_id
  JOIN games g ON g.competition_season_id=cs AND g.round_number=fl.round_number
  JOIN fantasy_player_game_scores fpgs ON fpgs.player_id=pr.player_id AND fpgs.game_id=g.id AND fpgs.rule_set_id=scoring_rules
  WHERE ft.competition_season_id=cs AND fl.status='LOCKED' AND fl.superseded_at IS NULL
  GROUP BY fl.id,fl.fantasy_team_id,ft.league_id,fl.round_number
  HAVING count(DISTINCT fls.id)=5
  ON CONFLICT(fantasy_team_id,round_number,input_revision) DO NOTHING;

  -- Totals for the demo. Position is deterministic even if several DEV users exist.
  INSERT INTO fantasy_team_totals(id,fantasy_team_id,league_id,competition_season_id,total_points,last_round_number,last_round_points,best_round_points,global_position,league_position,updated_at)
  SELECT gen_random_uuid(),ft.id,ft.league_id,cs,coalesce(sum(frs.points),0),max(frs.round_number),
    coalesce((array_agg(frs.points ORDER BY frs.round_number DESC))[1],0),coalesce(max(frs.points),0),
    row_number() OVER(ORDER BY coalesce(sum(frs.points),0) DESC,ft.created_at,ft.id),
    row_number() OVER(PARTITION BY ft.league_id ORDER BY coalesce(sum(frs.points),0) DESC,ft.created_at,ft.id),now()
  FROM fantasy_teams ft LEFT JOIN fantasy_round_scores frs ON frs.fantasy_team_id=ft.id AND frs.status='PUBLISHED' AND frs.superseded_at IS NULL
  WHERE ft.competition_season_id=cs GROUP BY ft.id,ft.league_id,ft.created_at
  ON CONFLICT(fantasy_team_id) DO UPDATE SET total_points=excluded.total_points,last_round_number=excluded.last_round_number,last_round_points=excluded.last_round_points,best_round_points=excluded.best_round_points,global_position=excluded.global_position,league_position=excluded.league_position,updated_at=now();
END $$;

COMMIT;

SELECT ft.id AS fantasy_team,fl.round_number,count(fls.id) FILTER(WHERE fls.role='STARTER') AS starters,frs.points
FROM fantasy_teams ft JOIN competition_seasons cs ON cs.id=ft.competition_season_id JOIN competitions c ON c.id=cs.competition_id JOIN federations f ON f.id=c.federation_id
LEFT JOIN fantasy_lineups fl ON fl.fantasy_team_id=ft.id AND fl.superseded_at IS NULL LEFT JOIN fantasy_lineup_slots fls ON fls.fantasy_lineup_id=fl.id
LEFT JOIN fantasy_round_scores frs ON frs.fantasy_team_id=ft.id AND frs.round_number=fl.round_number AND frs.superseded_at IS NULL
WHERE f.name='CANASTIO DEV SEED' GROUP BY ft.id,fl.round_number,frs.points ORDER BY ft.id,fl.round_number;
