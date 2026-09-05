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

## 2026-09-05 · Canastio adopta diseño mobile-first

Contexto: la portada y las superficies deportivas deben funcionar primero en teléfonos de 360–430 px; en el viewport iPhone XR el titular, el logo ambiental y el CTA competían por espacio.

Decisión: usar `100svh`, escala tipográfica acotada, gutters de 16–20 px, targets táctiles mínimos de 44 px y safe areas. En tablas se ocultan datos secundarios en móvil; solo el boxscore conserva desplazamiento horizontal. La navegación inferior queda limitada a cinco destinos prioritarios.

Consecuencia: cada sprint con UI debe verificar 320, 360, 390 y 430 px, además de desktop, y no puede aceptar recortes horizontales ni acciones críticas fuera del primer viewport.

## 2026-09-05 · API pública de lectura deportiva

Contexto: Sprint 8 necesita servir datos deportivos sin acoplar la PWA al ingestor ni a Afición FAB.

Decisión: los Server Components y Route Handlers comparten una capa `src/server/sports.ts` basada en Prisma. Las lecturas públicas se cachean durante 60 segundos, los listados usan páginas fijas de 20 elementos y los agregados de jugador se calculan desde `PlayerGameStat`.

Consecuencia: la API nunca consulta FAB ni expone `RawFabPayload`; una ausencia de estadísticas se representa explícitamente y no como ceros inventados.

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

<!-- harness:sprint-7-pwa-auth-shell -->
## 2026-09-05 · sprint-7-pwa-auth-shell aprobado

Contexto: se aprobó el spec `sprint-7-pwa-auth-shell` (Sprint 7 - PWA Auth and Shell).

Decisiones registradas:

- **auth_secrets:** Cookies seguras y validación server-side; service-role key y secretos FAB exclusivamente en servidor.
- **rollback_compat:** Migración aditiva para el perfil; desactivar auth no altera las tablas deportivas existentes.
- **tests:** Tests unitarios y de integración para middleware, callbacks, formularios, sesión, protección de rutas y manifest/service worker.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-8-sports-explorer -->
## 2026-09-05 · sprint-8-sports-explorer aprobado

Contexto: se aprobó el spec `sprint-8-sports-explorer` (Sprint 8 - Sports Explorer).

Decisiones registradas:

- **auth_secrets:** Las lecturas deportivas pasan por la API propia; no se exponen credenciales, payloads RAW ni llamadas directas a Afición FAB.
- **rollback_compat:** Es una capa de lectura y presentación sobre el esquema existente; cualquier cambio de Prisma debe ser aditivo y reversible.
- **tests:** E2E cubre calendario, partido con estadísticas, partido sin estadísticas y ficha de jugador; las consultas y agregados se prueban sin red FAB.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-9-fantasy-scoring-engine -->
## 2026-09-05 · sprint-9-fantasy-scoring-engine aprobado

Contexto: se aprobó el spec `sprint-9-fantasy-scoring-engine` (Sprint 9 - Fantasy Scoring Engine).

Decisiones registradas:

- **auth_secrets:** El motor se ejecuta exclusivamente en servidor sobre estadísticas persistidas, no necesita credenciales FAB nuevas y no expone credenciales ni RawFabPayload en API, breakdown, errores o logs.
- **rollback_compat:** Los rulesets publicados son inmutables y solo puede existir uno activo por competitionSeason y tipo de cálculo. La activación y reactivación son transaccionales y auditables. Retirar una versión la marca RETIRED sin borrar reglas ni resultados. Las correcciones de datos y los cambios de versión generan resultados separados por source_stats_version y ruleset, preservando el histórico.
- **tests:** Los casos dorados v1 quedan decidibles. Provincial: PTS=20, 3PM=2, FTM=4 y FC=3 produce raw=20.5. Nacional: PTS=20, REB=8, AST=5, STL=2, BLK=1, TO=3, FGM=7, FGA=15, FTM=4, FTA=6 y FC=3 produce raw=35.1. Con media=20 y desviación=10, raw=20.5 produce 20.5 FP; con media=25 y desviación=10, raw=35.1 produce 30.1 FP. Z≤-2 produce 0 FP y Z≥3 produce 50 FP. DNP produce 0 FP y no entra en la muestra. Una población de 19 o desviación cero produce PENDING/INSUFFICIENT_NORMALIZATION_SAMPLE con FP null; un null requerido produce NOT_CALCULABLE/MISSING_REQUIRED_STAT con ambos scores null. Las fronteras half-up incluyen 20.04→20.0 y 20.05→20.1. Se cubren además raw negativos, empates, null opcional, ausencia de bonus en v1 y actuaciones equivalentes entre ligas. Tests puros verifican determinismo, orden y serialización canónicos, SHA-256 y breakdown; PostgreSQL verifica constraints, idempotencia, concurrencia, rollback e histórico entre versiones. Los tests no dependen de la red FAB.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.
