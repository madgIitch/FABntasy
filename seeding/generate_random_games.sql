-- Calendario ida/vuelta, resultados y boxscores aleatorios para el seed DEV.
-- Ejecuta primero seeder.sql. Cambia v_seed (entre -1 y 1) para otra muestra.
-- Reejecutable: reemplaza exclusivamente partidos del seed DEV.
BEGIN;
DO $$
DECLARE
  v_seed float8:=0.260906; cs uuid; grp uuid; teams uuid[]; rnd uuid; game uuid;
  home uuid; away uuid; r int; slot int; hi int; ai int; s record;
  ftm int; fta int; p2m int; p2a int; p3m int; p3a int; ore int; dre int;
  ast int; stl int; tov int; blk int; foul int; mins numeric(8,3);
BEGIN
  PERFORM setseed(v_seed);
  SELECT g.competition_season_id,g.id INTO STRICT cs,grp FROM groups g
  JOIN competition_seasons x ON x.id=g.competition_season_id JOIN competitions c ON c.id=x.competition_id
  JOIN federations f ON f.id=c.federation_id
  WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES' AND g.name='Grupo A';
  SELECT array_agg(tr.team_id ORDER BY tr.display_name,tr.id) INTO teams FROM team_registrations tr WHERE tr.group_id=grp;
  IF coalesce(array_length(teams,1),0)<>4 THEN RAISE EXCEPTION 'Se esperaban 4 equipos; encontrados %',coalesce(array_length(teams,1),0); END IF;

  IF to_regclass('public.fantasy_player_game_scores') IS NOT NULL THEN
    EXECUTE 'DELETE FROM fantasy_player_game_scores WHERE game_id IN
      (SELECT id FROM games WHERE competition_season_id=$1)' USING cs;
  END IF;
  DELETE FROM player_game_stats WHERE game_id IN(SELECT id FROM games WHERE competition_season_id=cs);
  DELETE FROM games WHERE competition_season_id=cs;
  DELETE FROM rounds WHERE group_id=grp;

  FOR r IN 1..6 LOOP
    INSERT INTO rounds(id,group_id,number,name,starts_on,ends_on,created_at,updated_at)
    VALUES(gen_random_uuid(),grp,r,'Jornada '||r,DATE '2026-10-03'+((r-1)*7),DATE '2026-10-04'+((r-1)*7),now(),now()) RETURNING id INTO rnd;
    FOR slot IN 1..2 LOOP
      CASE ((r-1)%3)+1
        WHEN 1 THEN hi:=CASE slot WHEN 1 THEN 1 ELSE 2 END; ai:=CASE slot WHEN 1 THEN 4 ELSE 3 END;
        WHEN 2 THEN hi:=CASE slot WHEN 1 THEN 3 ELSE 2 END; ai:=CASE slot WHEN 1 THEN 1 ELSE 4 END;
        ELSE hi:=CASE slot WHEN 1 THEN 1 ELSE 3 END; ai:=CASE slot WHEN 1 THEN 2 ELSE 4 END;
      END CASE;
      IF r>3 THEN home:=teams[ai]; away:=teams[hi]; ELSE home:=teams[hi]; away:=teams[ai]; END IF;
      game:=gen_random_uuid();
      INSERT INTO games(id,competition_season_id,group_id,round_id,home_team_id,away_team_id,scheduled_at,source_timezone,
        round_number,status,source_status,home_score,away_score,record_type,has_statistics,source_updated_at,last_seen_at,
        sync_status,stats_sync_status,stats_synced_at,created_at,updated_at)
      VALUES(game,cs,grp,rnd,home,away,TIMESTAMPTZ '2026-10-03 17:00:00+02'+((r-1)*INTERVAL '7 days')+((slot-1)*INTERVAL '2 hours'),
        'Europe/Madrid',r,'finished','FINAL',0,0,'seed',true,now(),now(),'active','synced',now(),now(),now());

      FOR s IN SELECT pr.id registration_id,tr.team_id,row_number() OVER(PARTITION BY tr.team_id ORDER BY pr.shirt_number::int,pr.id) player_no
        FROM player_registrations pr JOIN team_registrations tr ON tr.id=pr.team_registration_id
        WHERE tr.competition_season_id=cs AND tr.team_id IN(home,away)
      LOOP
        IF random()<0.10 THEN
          mins:=0; ftm:=0; fta:=0; p2m:=0; p2a:=0; p3m:=0; p3a:=0; ore:=0; dre:=0; ast:=0; stl:=0; tov:=0; blk:=0; foul:=0;
        ELSE
          mins:=round((12+random()*24)::numeric,3); ftm:=floor(random()*6); fta:=ftm+floor(random()*4);
          p2m:=floor(random()*8); p2a:=p2m+floor(random()*7); p3m:=floor(random()*5); p3a:=p3m+floor(random()*5);
          ore:=floor(random()*4); dre:=floor(random()*8); ast:=floor(random()*8); stl:=floor(random()*4);
          tov:=floor(random()*5); blk:=floor(random()*3); foul:=floor(random()*6);
        END IF;
        INSERT INTO player_game_stats(id,game_id,player_registration_id,starter,minutes_played,milliseconds_played,points,
          free_throws_made,free_throws_attempted,two_pointers_made,two_pointers_attempted,three_pointers_made,three_pointers_attempted,
          offensive_rebounds,defensive_rebounds,rebounds,assists,steals,turnovers,blocks,blocks_received,fouls_committed,
          fouls_received,technical_fouls,valuation,plus_minus,created_at,updated_at)
        VALUES(gen_random_uuid(),game,s.registration_id,s.player_no<=5,mins,(mins*60000)::int,ftm+2*p2m+3*p3m,
          ftm,fta,p2m,p2a,p3m,p3a,ore,dre,ore+dre,ast,stl,tov,blk,0,foul,floor(random()*7),0,
          ftm+2*p2m+3*p3m+ore+dre+ast+stl+blk-tov,floor(random()*31)-15,now(),now());
      END LOOP;
      UPDATE games g SET
        home_score=(SELECT coalesce(sum(p.points),0) FROM player_game_stats p JOIN player_registrations pr ON pr.id=p.player_registration_id JOIN team_registrations tr ON tr.id=pr.team_registration_id WHERE p.game_id=game AND tr.team_id=home),
        away_score=(SELECT coalesce(sum(p.points),0) FROM player_game_stats p JOIN player_registrations pr ON pr.id=p.player_registration_id JOIN team_registrations tr ON tr.id=pr.team_registration_id WHERE p.game_id=game AND tr.team_id=away)
      WHERE g.id=game;
    END LOOP;
  END LOOP;
  UPDATE games SET score_by_period=jsonb_build_object('schemaVersion','seed.v1','final',jsonb_build_object('home',home_score,'away',away_score)),
    source_score=jsonb_build_object('home',home_score,'away',away_score) WHERE competition_season_id=cs;
  RAISE NOTICE 'Generados 6 jornadas, 12 partidos y 240 boxscores (seed=%).',v_seed;
END $$;
COMMIT;

SELECT g.round_number jornada,h.name local,g.home_score,a.name visitante,g.away_score FROM games g
JOIN teams h ON h.id=g.home_team_id JOIN teams a ON a.id=g.away_team_id JOIN competition_seasons x ON x.id=g.competition_season_id
JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id
WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES' ORDER BY g.round_number,g.scheduled_at;
