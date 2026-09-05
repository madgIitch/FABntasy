-- FABntasy: seed base temporal para Supabase (esquema 20260905000700).
-- Reejecutable. Solo elimina datos identificados por esta federación DEV.
BEGIN;
DO $$
DECLARE
  fed uuid:=gen_random_uuid(); comp uuid:=gen_random_uuid(); sea uuid:=gen_random_uuid();
  cs uuid:=gen_random_uuid(); grp uuid:=gen_random_uuid(); team uuid; tr uuid; player uuid;
  team_names text[]:=ARRAY['CB Triana','Basket Nervión','CD Macarena','Sevilla Hoops'];
  first_names text[]:=ARRAY['Alejandro','Pablo','Manuel','Javier','Álvaro','Carlos','Daniel','Sergio','Adrián','Mario','Hugo','Diego','Gonzalo','Rubén','Antonio','Miguel','David','José','Fernando','Raúl','Eduardo','Marcos','Víctor','Álex','Jorge','Guillermo','Ignacio','Francisco','Samuel','Iván','Jesús','Nicolás','Lucas','Óscar','Alberto','Rodrigo','Andrés','Borja','Jaime','Enrique'];
  surnames text[]:=ARRAY['García','Rodríguez','López','Martínez','Sánchez','Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres'];
  player_ids uuid[]; team_ids uuid[]; season_ids uuid[]; i int; j int; n int:=1;
BEGIN
  SELECT coalesce(array_agg(DISTINCT pr.player_id),ARRAY[]::uuid[]) INTO player_ids
  FROM player_registrations pr JOIN competition_seasons x ON x.id=pr.competition_season_id
  JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id
  WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES';
  SELECT coalesce(array_agg(DISTINCT r.team_id),ARRAY[]::uuid[]) INTO team_ids
  FROM team_registrations r JOIN competition_seasons x ON x.id=r.competition_season_id
  JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id
  WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES';
  SELECT coalesce(array_agg(DISTINCT x.season_id),ARRAY[]::uuid[]) INTO season_ids
  FROM competition_seasons x JOIN competitions c ON c.id=x.competition_id
  JOIN federations f ON f.id=c.federation_id WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES';

  -- Orden compatible con las FK RESTRICT del motor fantasy. Estas tablas son
  -- opcionales para que el seed funcione también antes de aplicar Sprint 9.
  IF to_regclass('public.fantasy_player_game_scores') IS NOT NULL
     AND to_regclass('public.fantasy_scoring_rule_sets') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM fantasy_player_game_scores s USING fantasy_scoring_rule_sets r
      WHERE s.rule_set_id=r.id AND r.competition_season_id IN
        (SELECT x.id FROM competition_seasons x JOIN competitions c ON c.id=x.competition_id
         JOIN federations f ON f.id=c.federation_id
         WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES')
    $sql$;
  END IF;
  IF to_regclass('public.fantasy_rule_set_activations') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM fantasy_rule_set_activations WHERE competition_season_id IN
        (SELECT x.id FROM competition_seasons x JOIN competitions c ON c.id=x.competition_id
         JOIN federations f ON f.id=c.federation_id
         WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES')
    $sql$;
  END IF;
  IF to_regclass('public.fantasy_scoring_rule_sets') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM fantasy_scoring_rule_sets WHERE competition_season_id IN
        (SELECT x.id FROM competition_seasons x JOIN competitions c ON c.id=x.competition_id
         JOIN federations f ON f.id=c.federation_id
         WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES')
    $sql$;
  END IF;
  DELETE FROM player_game_stats WHERE player_registration_id IN
    (SELECT pr.id FROM player_registrations pr JOIN competition_seasons x ON x.id=pr.competition_season_id JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES');
  DELETE FROM games WHERE competition_season_id IN
    (SELECT x.id FROM competition_seasons x JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES');
  DELETE FROM rounds WHERE group_id IN
    (SELECT g.id FROM groups g JOIN competition_seasons x ON x.id=g.competition_season_id JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES');
  DELETE FROM player_registrations WHERE competition_season_id IN
    (SELECT x.id FROM competition_seasons x JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES');
  DELETE FROM team_registrations WHERE competition_season_id IN
    (SELECT x.id FROM competition_seasons x JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES');
  DELETE FROM groups WHERE competition_season_id IN
    (SELECT x.id FROM competition_seasons x JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES');
  DELETE FROM competition_seasons WHERE competition_id IN
    (SELECT c.id FROM competitions c JOIN federations f ON f.id=c.federation_id WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES');
  DELETE FROM players WHERE id=ANY(player_ids); DELETE FROM teams WHERE id=ANY(team_ids);
  DELETE FROM competitions WHERE federation_id IN (SELECT id FROM federations WHERE name='CANASTIO DEV SEED' AND country_code='ES');
  DELETE FROM federations WHERE name='CANASTIO DEV SEED' AND country_code='ES';
  DELETE FROM seasons s WHERE s.id=ANY(season_ids) AND NOT EXISTS(SELECT 1 FROM competition_seasons x WHERE x.season_id=s.id);

  INSERT INTO federations(id,name,country_code,created_at,updated_at) VALUES(fed,'CANASTIO DEV SEED','ES',now(),now());
  INSERT INTO competitions(id,federation_id,name,created_at,updated_at) VALUES(comp,fed,'1ª Provincial Masculina - Demo',now(),now());
  INSERT INTO seasons(id,name,starts_on,ends_on,created_at,updated_at) VALUES(sea,'DEV 2026/2027','2026-09-01','2027-06-30',now(),now());
  INSERT INTO competition_seasons(id,competition_id,season_id,name,fantasy_enabled,fantasy_role,category_name,delegation_name,created_at,updated_at)
  VALUES(cs,comp,sea,'1ª Provincial Masculina Sevilla 2026/27',true,'primary','Senior Masculino','Sevilla',now(),now());
  INSERT INTO groups(id,competition_season_id,name,created_at,updated_at) VALUES(grp,cs,'Grupo A',now(),now());
  FOR i IN 1..4 LOOP
    team:=gen_random_uuid(); tr:=gen_random_uuid();
    INSERT INTO teams(id,name,club_name,created_at,updated_at) VALUES(team,team_names[i],team_names[i],now(),now());
    INSERT INTO team_registrations(id,team_id,competition_season_id,group_id,display_name,created_at,updated_at) VALUES(tr,team,cs,grp,team_names[i],now(),now());
    FOR j IN 1..10 LOOP
      player:=gen_random_uuid();
      INSERT INTO players(id,display_name,provisional,created_at,updated_at) VALUES(player,first_names[n]||' '||surnames[1+floor(random()*20)::int]||' '||surnames[1+floor(random()*20)::int],false,now(),now());
      INSERT INTO player_registrations(id,player_id,team_registration_id,competition_season_id,shirt_number,created_at,updated_at) VALUES(gen_random_uuid(),player,tr,cs,(j+3)::text,now(),now());
      n:=n+1;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Seed base listo: competition_season_id=%, group_id=%',cs,grp;
END $$;
COMMIT;

SELECT t.name equipo,count(pr.id) jugadores FROM teams t JOIN team_registrations tr ON tr.team_id=t.id
JOIN player_registrations pr ON pr.team_registration_id=tr.id JOIN competition_seasons x ON x.id=tr.competition_season_id
JOIN competitions c ON c.id=x.competition_id JOIN federations f ON f.id=c.federation_id
WHERE f.name='CANASTIO DEV SEED' AND f.country_code='ES' GROUP BY t.id,t.name ORDER BY t.name;
