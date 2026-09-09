SELECT p.display_name,t.name AS owner,up.username,rs.acquisition_price
FROM fantasy_roster_slots rs
JOIN player_registrations pr ON pr.id=rs.player_registration_id
JOIN players p ON p.id=pr.player_id
JOIN fantasy_teams t ON t.id=rs.fantasy_team_id
JOIN user_profiles up ON up.id=t.user_profile_id
WHERE rs.league_id=md5({{run_id}} || ':league')::uuid
ORDER BY up.username,p.display_name;
