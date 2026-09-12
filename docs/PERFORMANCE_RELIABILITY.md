# Performance and reliability runbook

## Reproducible gate

The gate uses only the Sprint 14F `realistic` synthetic fixture (12 real teams, 120–144 players and 20 managers) in an explicitly marked integration PostgreSQL database. It never loads application credentials or calls FAB, Supabase Auth, Web Push, or any network service.

```powershell
$env:CANASTIO_TEST_DATABASE="1"
$env:TEST_DATABASE_URL="postgresql://.../canastio_test"
node scripts/test-data.mjs cycle --profile realistic --seed 20092026 --run-id perf-realistic --clock 2026-09-12T10:00:00+02:00
corepack pnpm test:performance
```

`progress/performance-report.json` records the environment, dataset, concurrency, sample count, errors, p50 and p95 for cold and warm home, market and ranking reads. The runner rejects warm p95 above 800/1000/1000 ms and cold p95 above 1500 ms. Publication/load testing must additionally record a complete-round publication at no more than 30 seconds and concurrent interactive p95 at no more than 1500 ms.

## Query inventory

Capture each plan after loading `realistic`, using `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` and store the output beside the generated report. Queries are all local PostgreSQL reads:

- Home: active team/membership lookup, current lineup, upcoming/recent games, current published `fantasy_round_scores`, recent `player_price_events`, and recent league transactions.
- Market: league ownership from `fantasy_roster_slots`, active `market_protections`, current prices and player registrations.
- Ranking: ordered persisted `fantasy_team_totals`; optional current `fantasy_round_scores`. Requests never calculate player scores or a complete table.
- Publication: locked lineups and persisted player-game scores followed by atomic replacement of current round scores and totals.

The additive migration adds partial current-revision and covering publication indexes plus recent-market and ownership indexes. Remaining sorts are bounded (at most the realistic profile’s 20 managers or explicit `take` limits), so an index would add write cost without removing a costly scan.

## Atomicity, invalidation and degradation

Round publication remains a single serializable transaction. Only after commit are cache tags invalidated by league and round; a failed calculation leaves both the database’s prior current revision and cached prior response visible. Market mutations are idempotent by their existing idempotency key and invalidate only their league after commit. Private cache keys hash the server-resolved actor and league and include revision/variant. Values are process-local accelerators, never authority.

Set `CANASTIO_SERVER_CACHE_ENABLED=false` to bypass every cache without changing responses or data. To roll back, disable caching first, remove the new indexes independently with `DROP INDEX CONCURRENTLY`, then deploy the prior application. No table or public contract changes are required. Ingestor downtime does not affect reads because web routes query synchronized PostgreSQL data only.

## Metrics and alerts

Each operation emits `server_operation` with only `operation` (`home|market|ranking|publish`), `result` (`ok|error`), `cache` (`hit|miss|bypass|error`) and `durationMs`. Never attach cache keys, URLs with queries, tokens, cookies, user/league ids, names, emails or exception text.

Alert on warm p95 above the route budget for 10 minutes, cold/interactive p95 above 1500 ms for 5 minutes, error ratio above 2% for 5 minutes, publication above 30 seconds, or synchronized-data freshness above 10 minutes during an active jornada. Disable cache on suspected incompatibility; do not discard persisted revisions.
