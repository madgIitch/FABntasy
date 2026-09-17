# sprint-35-recent-competition-catalog-order · Competiciones recientes primero en el catálogo FAB — Diseño

## Scope (archivos que puede tocar)

- `apps/web/src/server/ingestion-admin.ts`
- `apps/web/src/server/ingestion-admin.test.ts`
- `tests/**`
- `docs/**`
- `spec/**`
- `progress/**`
- `.harness/**`

## Enfoque

- **data_model:** El modelo existente ya contiene lastChangedAt, que se inicializa al descubrir y solo cambia cuando cambia el checksum; lastCheckedAt se actualiza también en comprobaciones sin cambios y no debe usarse para ordenar.
- **external_contracts:** No cambia FAB ni el esquema de la API administrativa; únicamente cambia el orden de los elementos devueltos por la consulta existente.
- **edge_cases:** Los empates de lastChangedAt se resuelven por categoryCompetitionId ascendente, identidad FAB estable del catálogo. El nombre, el estado y monitored no participan en el desempate.
- **ui_states:** El catálogo general debe usar exclusivamente la actividad reciente; la sección separada de competiciones monitorizadas puede seguir filtrando el mismo resultado sin que monitored influya en la prioridad cronológica.

## Decisiones de la entrevista

- **adv-827a128afb:** ## Decisiones registradas
- **edge_cases:** Desempatar por `categoryCompetitionId` ascendente, que es la identidad FAB estable del catálogo. No usar nombre, estado ni monitorización como desempate.
- **tests:** Basta una prueba unitaria del argumento `orderBy` enviado a Prisma dentro de `getIngestionDashboard`, junto con las pruebas existentes del dashboard y los gates completos. No se necesita integración PostgreSQL porque no se introduce SQL manual, migración ni semántica distinta de la ordenación nativa de Prisma.

