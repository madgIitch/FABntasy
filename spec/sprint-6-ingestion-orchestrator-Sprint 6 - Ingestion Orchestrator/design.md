# sprint-6-ingestion-orchestrator · undefined — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `prisma/**`
- `infrastructure/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** `ingestion_runs` registra job, competición, timestamps, estado, contadores JSON no sensibles y `error_code`; no almacena trazas, credenciales ni payloads.
- **external_contracts:** Reutiliza los clientes y contratos FAB ya validados en Sprints 1–5; el orquestador no introduce endpoints nuevos.
- **edge_cases:** PostgreSQL advisory locks evitan solapes incluso entre procesos; una terminación libera el lock con la conexión; `stats_final` se salta salvo `--force-stats`.
- **ui_states:** Sin UI; operación por CLI, logs estructurados y tabla `ingestion_runs`.
