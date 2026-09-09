-- Read-only diagnosis. Replace the placeholder through the 14F runner before use.
SELECT
  ft.name AS fantasy_team,
  up.username,
  ft.balance_credits,
  coalesce(ledger.total,0) AS ledger_total,
  coalesce(roster.size,0) AS roster_size,
  coalesce(roster.cost,0) AS roster_cost
FROM fantasy_teams ft
JOIN user_profiles up ON up.id=ft.user_profile_id
LEFT JOIN LATERAL (SELECT sum(amount_credits) total FROM fantasy_budget_ledger WHERE fantasy_team_id=ft.id) ledger ON true
LEFT JOIN LATERAL (SELECT count(*) size,sum(acquisition_price) cost FROM fantasy_roster_slots WHERE fantasy_team_id=ft.id) roster ON true
WHERE ft.league_id=md5({{run_id}} || ':league')::uuid
GROUP BY ft.id,ft.name,up.username,ft.balance_credits,ledger.total,roster.size,roster.cost
ORDER BY up.username;
