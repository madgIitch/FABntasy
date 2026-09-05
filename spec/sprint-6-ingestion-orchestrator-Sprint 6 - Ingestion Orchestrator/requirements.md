# sprint-6-ingestion-orchestrator · undefined — Requisitos

- name: `Sprint 6 - Ingestion Orchestrator` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-05T03:39:04.387Z

## Contexto



## Requisitos funcionales

R1. AC1: `sync-all` ejecuta schedule y stats para cada CompetitionSeason activa seleccionada, reutiliza los comandos existentes y devuelve un resumen agregado sin datos sensibles.
R2. AC2: Un PostgreSQL advisory lock por job y CompetitionSeason impide procesamiento solapado; un segundo proceso registra `skipped_locked` y no modifica datos deportivos.
R3. AC3: `run-scheduler` usa intervalos configurables de 60–180 minutos en reposo y 5–15 minutos en ventanas de jornada, evaluadas en `Europe/Madrid`; `sync-all` permite ejecución one-shot externa.
R4. AC4: Cada fase crea un `ingestion_run` con inicio, fin, estado, contadores saneados y `error_code`; nunca persiste secretos, payloads FAB ni mensajes de excepción sin redactar.
R5. AC5: Fallos transitorios usan retries/backoff acotado y circuit breaker configurable; nunca borran datos previamente confirmados y el siguiente ciclo queda reintentable.
R6. AC6: Stats solo consulta partidos terminados elegibles cuyo estado no sea `stats_final`, salvo resync explícito mediante `--force-stats`.
R7. AC7: SIGINT/SIGTERM detiene nuevas fases, deja terminar o revierte la fase transaccional activa dentro del timeout configurado y no deja locks persistentes.
R8. AC8: Tests sin red cubren calendario, DST, locks, retries, circuit breaker, filtrado `stats_final`, redacción y shutdown; integración PostgreSQL prueba exclusión e `ingestion_runs`.

## Restricciones

- **error_states:** Los pasos competition, schedule y stats se registran por separado; un fallo conserva datos anteriores, aplica backoff acotado y abre un circuit breaker temporal tras fallos consecutivos.
- **auth_secrets:** El worker usa exclusivamente configuración server-side y solo emite códigos de error y contadores saneados.
- **rollback_compat:** Migración aditiva; jobs transaccionales por fase; advisory locks transaccionales y cierre controlado ante SIGINT/SIGTERM.
