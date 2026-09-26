# sprint-42-multi-competition-player-pool · Selección de competiciones para una liga Fantasy — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Relación liga-ediciones y edición principal.
- **external_contracts:** POST de creación y respuestas de liga.
- **edge_cases:** Deshabilitación concurrente, partidos reprogramados y ventanas vacías.
- **ui_states:** Selector, resumen, carga, error y vacío.
