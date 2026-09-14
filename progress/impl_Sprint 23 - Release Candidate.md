# Implementación · Sprint 23 - Release Candidate

## Intento 1

Se inició la infraestructura de certificación sin introducir una fuente de verdad nueva:

- manifiesto saneado `fabntasy-rc.v1` y validador ejecutable;
- taxonomía ejecutable de defectos y aceptación de riesgos;
- reconciliación SQL de duplicados, revisiones vigentes, publicación y precios;
- matriz Playwright de Chromium, Firefox y WebKit en 375x812 y 1440x900;
- runbook, plantilla de informe y registro único de defectos;
- gates RC añadidos al harness.

## Verificación local

- `node --test tests/release-candidate/manifest.test.mjs`: 6 OK.
- `corepack pnpm typecheck`: OK.
- `corepack pnpm lint`: OK.
- `corepack pnpm test`: 133 OK.
- `uv run --directory services/fab_ingestor python -m pytest`: 90 OK, 5 omitidos sin PostgreSQL.
- `uv run --directory services/fab_ingestor ruff check .`: OK.
- `corepack pnpm exec prisma validate`: OK.
- Playwright: 6 públicos OK; 42 privados omitidos por no disponer de storage state e IDs sembrados.
- `corepack pnpm --filter @fabntasy/web audit:dependencies`: OK tras remediar 3 vulnerabilidades HIGH transitivas; queda 1 moderada.

## Bloqueos operativos

La certificación no puede declararse completa sin valores del entorno real: IDs FAB/jornada, ligas de prueba, responsables, digests desplegados y baseline; tampoco sin una sesión E2E sembrada, IDs deportivos y acceso a PostgreSQL de integración/producción controlada. FAB real no se sustituye por fixtures para emitir el veredicto RC.

El usuario autorizó ampliar el scope a manifests y lockfile. Overrides mínimos de PostCSS 8.5.18 y deepmerge-ts 8.0.0 eliminan los tres avisos HIGH sin salto mayor de Next o Prisma.
