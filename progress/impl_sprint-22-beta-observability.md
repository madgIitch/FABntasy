# Sprint 22 · implementación

Implementados esquema/adaptadores web e ingestor, redacción previa, clasificación, deduplicación, umbrales de salud, estado admin autorizado, feedback separado con consentimiento/rate-limit/idempotencia, flags y runbook.

Validación: Prisma validate, typecheck, lint, pytest (74 passed, 5 skipped con basetemp local) y ruff pasan. El runner web Vitest queda pendiente porque esbuild intenta enumerar un directorio padre restringido por el sandbox antes de cargar `vitest.config.ts`; no es un fallo de assertions. T16 permanece sin marcar hasta ejecutar `pnpm test` y diff-scope en un entorno sin esa restricción.
