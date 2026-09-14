# hotfix-partial-round-fantasy-lifecycle · Procesamiento fantasy de jornadas parcialmente sincronizadas — Diseño

## Scope (archivos que puede tocar)

- `apps/web/src/server/fantasy-lifecycle.ts`
- `apps/web/src/server/fantasy-lifecycle.test.ts`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** No requiere migraciones; reutiliza estadísticas, puntuaciones y valores versionados existentes.
- **external_contracts:** Mantiene el contrato HTTP del lifecycle y solo cambia la selección de jornadas elegibles.
- **edge_cases:** Cubre jornadas completas, mixtas y sin ningún partido stats_final.
- **ui_states:** Los jugadores con boxscore final reciben forma y valor; los pendientes conservan su estado anterior.

