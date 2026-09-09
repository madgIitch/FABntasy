-- Raises on any 14F sports-foundation violation.
DO $$
DECLARE
  v_run text := {{run_id}};
  v_cs uuid := md5(v_run || ':competition-season')::uuid;
  v_group uuid := md5(v_run || ':group')::uuid;
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM team_registrations WHERE competition_season_id=v_cs;
  IF v_count <> {{real_teams}} THEN RAISE EXCEPTION '14F teams: expected %, found %',{{real_teams}},v_count; END IF;

  SELECT count(*) INTO v_count FROM player_registrations WHERE competition_season_id=v_cs;
  IF v_count <> ({{real_teams}} * {{players_per_team}}) THEN
    RAISE EXCEPTION '14F players: expected %, found %',({{real_teams}} * {{players_per_team}}),v_count;
  END IF;

  SELECT count(*) INTO v_count FROM rounds WHERE group_id=v_group;
  IF v_count <> {{rounds}} THEN RAISE EXCEPTION '14F rounds: expected %, found %',{{rounds}},v_count; END IF;

  SELECT count(*) INTO v_count FROM games WHERE competition_season_id=v_cs;
  IF v_count <> ({{rounds}} * ({{real_teams}} / 2)) THEN
    RAISE EXCEPTION '14F games: expected %, found %',({{rounds}} * ({{real_teams}} / 2)),v_count;
  END IF;

  IF EXISTS(
    SELECT 1 FROM player_registrations pr
    JOIN team_registrations tr ON tr.id=pr.team_registration_id
    WHERE pr.competition_season_id=v_cs AND tr.competition_season_id<>v_cs
  ) THEN RAISE EXCEPTION '14F player/team season mismatch'; END IF;

  IF EXISTS(
    SELECT 1 FROM games g JOIN LATERAL (
      SELECT tr.team_id,sum(pgs.minutes_played) minutes,sum(pgs.points) points
      FROM player_game_stats pgs JOIN player_registrations pr ON pr.id=pgs.player_registration_id JOIN team_registrations tr ON tr.id=pr.team_registration_id
      WHERE pgs.game_id=g.id GROUP BY tr.team_id
    ) totals ON true
    WHERE g.competition_season_id=v_cs AND (abs(totals.minutes-200)>0.01 OR (totals.team_id=g.home_team_id AND totals.points<>g.home_score) OR (totals.team_id=g.away_team_id AND totals.points<>g.away_score))
  ) THEN RAISE EXCEPTION '14F boxscore minutes or score mismatch'; END IF;
  IF EXISTS(
    SELECT 1 FROM player_game_stats pgs JOIN games g ON g.id=pgs.game_id
    WHERE g.competition_season_id=v_cs AND (
      pgs.free_throws_made>pgs.free_throws_attempted OR pgs.two_pointers_made>pgs.two_pointers_attempted OR
      pgs.three_pointers_made>pgs.three_pointers_attempted OR
      pgs.points<>(pgs.free_throws_made+2*pgs.two_pointers_made+3*pgs.three_pointers_made)
    )
  ) THEN RAISE EXCEPTION '14F invalid shooting line or player points'; END IF;
END $$;
