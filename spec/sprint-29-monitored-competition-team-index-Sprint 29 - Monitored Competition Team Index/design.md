# sprint-29-monitored-competition-team-index · Índice de equipos y jugadores en competiciones monitorizadas — Diseño

## Scope (archivos que puede tocar)

- `apps/web/app/app/admin/ingestion/**`
- `apps/web/app/api/admin/ingestion/**`
- `apps/web/src/server/ingestion-admin.ts`
- `apps/web/src/server/ingestion-admin.test.ts`
- `apps/web/src/server/ingestion-admin-http.ts`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `tests/**`
- `docs/INGESTION_ADMIN.md`
- `docs/operations/FAB_COMPETITION_MONITORING_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/CONVENTIONS.md`
- `docs/DECISIONS.md`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Los equipos e inscripciones se agregan desde TeamRegistration y PlayerRegistration de la CompetitionSeason; los conteos representan inscripciones, no personas globalmente únicas.
- **external_contracts:** Se especifican campos, nullabilidad, timestamps UTC y semántica de los totales y filas del resumen administrativo.
- **edge_cases:** Se fijan equipos homónimos, inscripciones multitemporada, aislamiento entre competiciones, orden estable y snapshots parciales o fallidos.
- **ui_states:** El índice es desplegable y accesible, con carga, vacío, advertencia, error, reintento y comportamiento responsive definidos.

