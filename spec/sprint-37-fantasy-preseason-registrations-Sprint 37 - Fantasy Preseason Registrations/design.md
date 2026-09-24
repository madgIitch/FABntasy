# sprint-37-fantasy-preseason-registrations · Inscripciones de pretemporada y conciliación con boxscores — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `apps/web/src/server/**`
- `apps/web/src/components/canastio-market.tsx`
- `apps/web/app/app/admin/ingestion/**`
- `apps/web/app/api/admin/ingestion/**`
- `apps/web/app/app/mercado/**`
- `apps/web/app/app/mi-equipo/**`
- `apps/web/e2e/**`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `tests/**`
- `docs/INGESTION_ADMIN.md`
- `docs/operations/**`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Player y PlayerRegistration conservan UUID; nuevas identidades FAB se validan antes de persistir y se protege toda referencia fantasy.
- **external_contracts:** La fuente de plantilla previa y su clave común con boxscore son condición de entrada verificable; no se supone su existencia.
- **edge_cases:** Se cubren boxscore antes de plantilla, homónimos, cambios de equipo, reinicios y dos dispositivos.
- **ui_states:** Cobertura de equipos, inscripciones y estadísticas se representa por separado con fechas y progreso.
