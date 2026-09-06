# Implementación · Sprint 11 - Player Pricing

## 2026-09-06 — estado: review_pending

- Motor determinista de precio global con cold start de 5 M, rating 70/30, percentiles, curva objetivo y límites +12%/-10%.
- Tratamiento explícito de muestra insuficiente, aplazamientos y rachas DNP.
- Persistencia aditiva `player_prices`/`player_price_events`, revisiones por hash, transacción serializable y advisory lock.
- Backfill cronológico, API `player-price-api.v1` y captura del precio vigente en nuevas adquisiciones.
- Vista `/app/mercado` y plusvalía en Mi equipo.
- Cláusula base pura al 175%; sin transferencias ni saldo antes del Sprint 13.

## Verificación

- `pnpm typecheck`: OK
- `pnpm lint`: OK
- `pnpm test`: 29 tests OK
- `uv run --directory services/fab_ingestor python -m pytest`: 46 OK, 5 omitidos por requerir PostgreSQL de integración
- `uv run --directory services/fab_ingestor ruff check .`: OK
- `pnpm exec prisma validate`: OK
- `git diff --check`: OK

## Pendiente

- Aplicar la migración en un PostgreSQL de desarrollo y ejecutar el smoke humano de La Bolsa Canastio antes de marcar el sprint como `done`.
