# sprint-6-ingestion-orchestrator · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) AC1: `sync-all` ejecuta schedule y stats para cada CompetitionSeason activa seleccionada, reutiliza los comandos existentes y devuelve un resumen agregado sin datos sensibles.  ↔ R1
- [x] (T2) AC2: Un PostgreSQL advisory lock por job y CompetitionSeason impide procesamiento solapado; un segundo proceso registra `skipped_locked` y no modifica datos deportivos.  ↔ R2
- [x] (T3) AC3: `run-scheduler` usa intervalos configurables de 60–180 minutos en reposo y 5–15 minutos en ventanas de jornada, evaluadas en `Europe/Madrid`; `sync-all` permite ejecución one-shot externa.  ↔ R3
- [x] (T4) AC4: Cada fase crea un `ingestion_run` con inicio, fin, estado, contadores saneados y `error_code`; nunca persiste secretos, payloads FAB ni mensajes de excepción sin redactar.  ↔ R4
- [x] (T5) AC5: Fallos transitorios usan retries/backoff acotado y circuit breaker configurable; nunca borran datos previamente confirmados y el siguiente ciclo queda reintentable.  ↔ R5
- [x] (T6) AC6: Stats solo consulta partidos terminados elegibles cuyo estado no sea `stats_final`, salvo resync explícito mediante `--force-stats`.  ↔ R6
- [x] (T7) AC7: SIGINT/SIGTERM detiene nuevas fases, cancela nuevas peticiones FAB, acota la llamada activa por timeout y no deja locks persistentes.  ↔ R7
- [x] (T8) AC8: Tests sin red cubren calendario, DST, locks, retries, circuit breaker, filtrado `stats_final`, redacción y shutdown; integración PostgreSQL prueba exclusión e `ingestion_runs`.  ↔ R8
- [x] Tests que cubran los criterios de aceptación
