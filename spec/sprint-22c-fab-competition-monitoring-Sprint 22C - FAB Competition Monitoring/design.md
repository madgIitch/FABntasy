# sprint-22c-fab-competition-monitoring · Catálogo y monitorización de competiciones FAB — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `apps/web/app/app/admin/ingestion/**`
- `apps/web/app/api/admin/ingestion/**`
- `apps/web/src/server/ingestion-admin.ts`
- `apps/web/src/server/ingestion-admin.test.ts`
- `apps/web/src/server/ingestion-admin-http.ts`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `tests/**`
- `docs/operations/**`
- `docs/ARCHITECTURE.md`
- `docs/CONVENTIONS.md`
- `docs/DECISIONS.md`
- `.env.example`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Catálogo, observaciones, ejecuciones, eventos de cambio y vínculo opcional con competition_seasons mediante migración aditiva.
- **external_contracts:** Enumeración paginada sin filtro nominal, rate limiting y separación entre catálogo ligero e ingesta profunda.
- **edge_cases:** Renombrados, textos duplicados, IDs distintos, páginas repetidas, reanudación y discrepancias entre nombre interno y FAB.
- **ui_states:** Resumen, tarjetas monitorizadas, catálogo filtrable y estados saludables, obsoletos, parciales y fallidos.

