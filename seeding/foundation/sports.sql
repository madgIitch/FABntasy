-- 14F deterministic sports foundation. Rendered only by scripts/test-data.mjs.
BEGIN;
DO $$
DECLARE
  v_run text := {{run_id}};
  v_clock timestamptz := {{clock}};
  v_fed uuid := md5(v_run || ':federation')::uuid;
  v_comp uuid := md5(v_run || ':competition')::uuid;
  v_season uuid := md5(v_run || ':season')::uuid;
  v_cs uuid := md5(v_run || ':competition-season')::uuid;
  v_group uuid := md5(v_run || ':group')::uuid;
  v_team uuid;
  v_team_registration uuid;
  v_player uuid;
  v_round uuid;
  v_home uuid;
  v_away uuid;
  v_game uuid;
  i integer;
  j integer;
  slot integer;
BEGIN
  INSERT INTO federations(id,name,country_code,created_at,updated_at)
  VALUES(v_fed,'CANASTIO TEST ' || v_run,'ES',v_clock,v_clock)
  ON CONFLICT(id) DO NOTHING;

  INSERT INTO competitions(id,federation_id,name,created_at,updated_at)
  VALUES(v_comp,v_fed,'1ª Provincial Masculina · ' || v_run,v_clock,v_clock)
  ON CONFLICT(id) DO NOTHING;

  INSERT INTO seasons(id,name,starts_on,ends_on,created_at,updated_at)
  VALUES(v_season,'TEST ' || v_run,(v_clock::date - 30),(v_clock::date + 300),v_clock,v_clock)
  ON CONFLICT(id) DO NOTHING;

  INSERT INTO competition_seasons(id,competition_id,season_id,name,fantasy_enabled,fantasy_role,category_name,delegation_name,created_at,updated_at)
  VALUES(v_cs,v_comp,v_season,'Temporada sintética ' || v_run,true,'validation','Senior Masculino','Sevilla',v_clock,v_clock)
  ON CONFLICT(id) DO NOTHING;

  INSERT INTO groups(id,competition_season_id,name,created_at,updated_at)
  VALUES(v_group,v_cs,'Grupo TEST ' || v_run,v_clock,v_clock)
  ON CONFLICT(id) DO NOTHING;

  FOR i IN 1..{{real_teams}} LOOP
    v_team := md5(v_run || ':team:' || i)::uuid;
    v_team_registration := md5(v_run || ':team-registration:' || i)::uuid;
    INSERT INTO teams(id,name,club_name,created_at,updated_at)
    VALUES(v_team,'Club Sintético ' || lpad(i::text,2,'0'),'Canastio Test',v_clock,v_clock)
    ON CONFLICT(id) DO NOTHING;
    INSERT INTO team_registrations(id,team_id,competition_season_id,group_id,display_name,created_at,updated_at)
    VALUES(v_team_registration,v_team,v_cs,v_group,'Club Sintético ' || lpad(i::text,2,'0'),v_clock,v_clock)
    ON CONFLICT(id) DO NOTHING;
    FOR j IN 1..{{players_per_team}} LOOP
      v_player := md5(v_run || ':player:' || i || ':' || j)::uuid;
      INSERT INTO players(id,display_name,provisional,created_at,updated_at)
      VALUES(v_player,'Jugador ' || lpad(i::text,2,'0') || '-' || lpad(j::text,2,'0'),false,v_clock,v_clock)
      ON CONFLICT(id) DO NOTHING;
      INSERT INTO player_registrations(id,player_id,team_registration_id,competition_season_id,shirt_number,created_at,updated_at)
      VALUES(md5(v_run || ':player-registration:' || i || ':' || j)::uuid,v_player,v_team_registration,v_cs,(j + 3)::text,v_clock,v_clock)
      ON CONFLICT(id) DO NOTHING;
    END LOOP;
  END LOOP;

  FOR i IN 1..{{rounds}} LOOP
    v_round := md5(v_run || ':round:' || i)::uuid;
    INSERT INTO rounds(id,group_id,number,name,starts_on,ends_on,created_at,updated_at)
    VALUES(v_round,v_group,i,'Jornada ' || i,(v_clock::date + ((i-1)*7)),(v_clock::date + ((i-1)*7) + 1),v_clock,v_clock)
    ON CONFLICT(id) DO NOTHING;
    FOR slot IN 1..({{real_teams}} / 2) LOOP
      v_home := md5(v_run || ':team:' || slot)::uuid;
      v_away := md5(v_run || ':team:' || ({{real_teams}} - slot + 1))::uuid;
      IF (i % 2)=0 THEN
        v_game := v_home; v_home := v_away; v_away := v_game;
      END IF;
      v_game := md5(v_run || ':game:' || i || ':' || slot)::uuid;
      INSERT INTO games(id,competition_season_id,group_id,round_id,home_team_id,away_team_id,scheduled_at,source_timezone,round_number,status,source_status,record_type,has_statistics,last_seen_at,sync_status,stats_sync_status,created_at,updated_at)
      VALUES(v_game,v_cs,v_group,v_round,v_home,v_away,v_clock + ((i-1)*interval '7 days') + (slot*interval '2 hours'),'Europe/Madrid',i,'scheduled','SCHEDULED','test',false,v_clock,'active','pending',v_clock,v_clock)
      ON CONFLICT(id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
COMMIT;
