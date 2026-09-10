# sprint-6-ingestion-orchestrator · undefined — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `apps/web/src/server/**`
- `apps/web/src/app/api/internal/**`
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

## Ampliación aprobada

El scheduler conserva la ingesta Python como proceso conductor. Después de sincronizar estadísticas llama mediante HTTP server-to-server a un endpoint interno de Next.js protegido por secreto. El backend selecciona exclusivamente jornadas cuyos partidos activos estén finalizados y con estadísticas `stats_final`, y ejecuta scoring, ranking y pricing usando los servicios de dominio existentes. La ausencia de configuración mantiene compatibilidad local; configurar solo URL o solo secreto es un error de arranque.
