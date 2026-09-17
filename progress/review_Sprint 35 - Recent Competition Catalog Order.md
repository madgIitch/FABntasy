# Revisión · Sprint 35 - Recent Competition Catalog Order

Estado: `review_pending`

## Implementación

- El catálogo general ordena por `lastChangedAt DESC`.
- Los empates se resuelven por `categoryCompetitionId ASC`.
- `monitored` y `lastCheckedAt` no afectan a la prioridad.
- Los filtros y el límite de 200 resultados se conservan.

## Verificación

- Typecheck: OK.
- Lint: OK, con 3 warnings preexistentes de `no-img-element`.
- Vitest: 181 tests OK.
- Pytest: 104 OK, 5 omitidos.
- Ruff: OK.
- Prisma validate: OK.
- Diff-scope: OK.

## Smoke humano pendiente

Validar en `/app/admin/ingestion` que una competición recién descubierta o modificada aparece al principio del catálogo general.
