# sprint-35-recent-competition-catalog-order · Competiciones recientes primero en el catálogo FAB — Requisitos

- name: `Sprint 35 - Recent Competition Catalog Order` · priority: P2 · sdd: true
- aprobado por: peorr · 2026-09-17T18:03:09.804Z

## Contexto

Ordenar el catálogo administrativo FAB por la actividad real más reciente, de modo que una competición recién descubierta o cuyo contenido acaba de cambiar aparezca al principio.

## Requisitos funcionales

R1. La consulta del catálogo general ordena primero por lastChangedAt descendente y no usa lastCheckedAt ni monitored como claves de prioridad.
R2. Una fila recién insertada, cuyo lastChangedAt se inicializa en el momento del descubrimiento, aparece antes que cualquier fila con lastChangedAt anterior.
R3. Cuando cambia el checksum de una competición, la actualización de lastChangedAt hace que aparezca antes que filas con actividad anterior.
R4. Una observación con checksum idéntico actualiza lastCheckedAt pero conserva lastChangedAt y, por tanto, no cambia la prioridad cronológica.
R5. Cambiar monitored entre true y false no modifica la posición relativa de dos filas con distintos valores de lastChangedAt.
R6. Los empates de lastChangedAt se resuelven por categoryCompetitionId ascendente.
R7. Los filtros catalogQuery, catalogStatus, delegation y season conservan sus predicados actuales y el orden reciente se aplica sobre el conjunto filtrado.
R8. El límite existente de 200 resultados se aplica después de la ordenación, devolviendo las 200 competiciones con actividad más reciente que satisfagan los filtros.
R9. Las pruebas cubren descubrimiento, cambio, comprobación sin cambios, independencia de monitored, empate determinista y combinación con filtros.
R10. corepack pnpm typecheck, corepack pnpm lint, corepack pnpm test y diff-scope finalizan con código cero.

## Restricciones

- **error_states:** La feature solo modifica la ordenación de lectura; conserva los estados DISCOVERED, UNCHANGED, CHANGED, STALE, PARTIAL y FAILED y no introduce errores nuevos.
- **auth_secrets:** No cambia la autorización INGESTION_ADMIN, las mutaciones, los secretos ni la exposición de datos sensibles.
- **rollback_compat:** El cambio puede revertirse restaurando el orderBy anterior; no requiere migración ni modifica datos persistidos.
