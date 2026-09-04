# sprint-3-active-competition-discovery · undefined — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `prisma/**`
- `apps/web/src/server/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Enfoque

- **data_model:** La categoría FAB seleccionada se representa como Competition + CompetitionSeason y conserva `Id`, `IdCompeticionCategoria`, categoría, competición y delegación mediante external IDs y metadatos normalizados. Se añade una marca primaria protegida por índice único parcial.
- **external_contracts:** Discovery usa exclusivamente `buscarCategoria`. La APK y una respuesta real confirman `/v2/categoria.ashx`: `fasesGrupos` recibe `id_categoria_competicion` y `equipos` recibe fase, grupo, tipo, jornada y ventana.
- **edge_cases:** El nombre no determina temporada ni identidad; los IDs opacos permanecen texto; repetir selección/sync es idempotente; grupos ausentes no se inventan y equipos sin grupo quedan ligados solo a CompetitionSeason cuando el contrato lo permita.
- **ui_states:** La administración inicial es CLI: listado de candidatos, selección explícita por `IdCompeticionCategoria` y resumen de sync; no se implementa UI web en este sprint.

## Decisiones de la entrevista

- **external_contracts:** Validar primero con llamadas reales y guardar fixtures anonimizadas. No inventar la firma de `equipos`; si no puede confirmarse, bloquear el cierre del sprint.
- **ui_states:** Usar CLI. La interfaz web administrativa queda fuera de este sprint.
