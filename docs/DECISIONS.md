# Decisiones (ADR)

Formato por entrada: **fecha · título** — contexto, decisión y consecuencias.
El harness añade entradas cuando se aprueba un spec; el agente también debe añadir entradas cuando toma
una decisión de arquitectura relevante durante implementación.

## Pendientes de decisión

- (rellenar) Decisiones que aún no deben asumirse automáticamente.

<!-- Nuevas entradas debajo -->

<!-- harness:sprint-0-project-foundation -->
## 2026-09-04 · sprint-0-project-foundation aprobado

Contexto: se aprobó el spec `sprint-0-project-foundation` (Sprint 0 - Project Foundation).

Decisiones registradas:

- **auth_secrets:** FAB_DEVICE, FAB_KEY, SECRET, PASSWORD y TOKEN son siempre server-side; ninguna variable sensible usa NEXT_PUBLIC_.
- **rollback_compat:** La migración inicial es vacía y la estructura permite continuar sin autenticación, fantasy ni mercado.
- **tests:** Se cubren los comandos de TypeScript, lint, tests, pytest y validación Prisma definidos por el spec.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-1-fab-client -->
## 2026-09-04 · sprint-1-fab-client aprobado

Contexto: se aprobó el spec `sprint-1-fab-client` (Sprint 1 - FAB Client).

Decisiones registradas:

- **auth_secrets:** id_dispositivo y key nunca se registran, incluyen en excepciones ni se exponen mediante variables públicas.
- **rollback_compat:** El cliente queda aislado detrás de FabClient y no modifica el modelo deportivo ni introduce llamadas FAB desde la PWA.
- **tests:** Fixtures anonimizadas y transporte simulado cubren registro, rotación, paginación, timeout, reintentos y errores sin red real.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-2-sports-data-model -->
## 2026-09-04 · sprint-2-sports-data-model aprobado

Contexto: se aprobó el spec `sprint-2-sports-data-model` (Sprint 2 - Sports Data Model).

Decisiones registradas:

- **auth_secrets:** `raw_fab_payloads.payload` se sanea antes de persistir y rechaza claves sensibles (`key`, `id_dispositivo`, token, password, secret); la base no almacena credenciales FAB en tablas deportivas.
- **rollback_compat:** La migración solo añade tablas deportivas, es reversible en desarrollo y no modifica el contrato del `FabClient` ni introduce tablas fantasy.
- **tests:** Se prueban esquema, constraints y UPSERT con PostgreSQL real de test; además hay tests unitarios de saneado y mapeo. `prisma validate`, Python y gates existentes deben pasar.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-3-active-competition-discovery -->
## 2026-09-04 · sprint-3-active-competition-discovery aprobado

Contexto: se aprobó el spec `sprint-3-active-competition-discovery` (Sprint 3 - Active Competition Discovery).

Decisiones registradas:

- **auth_secrets:** Todas las llamadas pasan por FabClient y FileCredentialStore; CLI y logs muestran solo IDs deportivos y nombres, nunca credenciales; RAW se sanea con el contrato del Sprint 2.
- **rollback_compat:** Cambiar la competición primaria requiere transacción; un fallo conserva la anterior. La migración solo añade metadatos/constraint de selección y puede revertirse en desarrollo.
- **tests:** Fixtures anonimizadas cubren discovery, selección, cero resultados, ambigüedad, repetición, RAW y bloqueo contractual; integración PostgreSQL verifica unicidad primaria y rollback.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-4-schedule-and-games-ingestion -->
## 2026-09-04 · sprint-4-schedule-and-games-ingestion aprobado

Contexto: se aprobó el spec `sprint-4-schedule-and-games-ingestion` (Sprint 4 - Schedule and Games Ingestion).

Decisiones registradas:

- **auth_secrets:** Todas las llamadas pasan por FabClient/FileCredentialStore y RawFabPayload elimina credenciales; CLI solo informa conteos e IDs deportivos.
- **rollback_compat:** Cada sincronización normalizada es transaccional; no borra Game ni RAW histórico. La migración aditiva de estado de sincronización tiene rollback de desarrollo.
- **tests:** Fixtures anonimizadas y tests cubren contrato, mapeo, alta, reprogramación, resultado, duplicados, stale y rollback; integración usa PostgreSQL real y las pruebas normales no llaman a FAB.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-5-boxscore-ingestion -->
## 2026-09-05 · sprint-5-boxscore-ingestion aprobado

Contexto: se aprobó el spec `sprint-5-boxscore-ingestion` (Sprint 5 - Boxscore Ingestion).

Decisiones registradas:

- **auth_secrets:** El endpoint solo se consume desde FabClient con credenciales server-side; RAW y logs se sanean.
- **rollback_compat:** La escritura de jugadores, inscripciones, estadísticas y estado del partido es transaccional; migraciones únicamente aditivas.
- **tests:** Fixtures anonimizadas y tests cubren mapping, nullability, identidad provisional/estable, correcciones, duplicados, contradicciones y rollback PostgreSQL.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-6-ingestion-orchestrator -->
## 2026-09-05 · sprint-6-ingestion-orchestrator aprobado

Contexto: se aprobó el spec `sprint-6-ingestion-orchestrator` (Sprint 6 - Ingestion Orchestrator).

Decisiones registradas:

- **auth_secrets:** El worker usa exclusivamente configuración server-side y solo emite códigos de error y contadores saneados.
- **rollback_compat:** Migración aditiva; jobs transaccionales por fase; advisory locks transaccionales compatibles con el pool de Supabase y cierre controlado ante SIGINT/SIGTERM.
- **tests:** Reloj y sleeper inyectables; tests sin esperas reales para calendario, locks, retries, circuit breaker y shutdown; PostgreSQL valida exclusión mutua y runs.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.
