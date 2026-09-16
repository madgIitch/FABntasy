# sprint-31-catalog-link-and-retired-games · Recuperación de datos monitorizados y partidos retirados — Requisitos

- name: `Sprint 31 - Catalog Link and Retired Games` · priority: P0 · sdd: true
- aprobado por: peorr · 2026-09-16T16:54:31.598Z

## Contexto



## Requisitos funcionales

R1. Una fila de catálogo con category_competition_id 10468 queda enlazada a la CompetitionSeason cuyo external_id FAB_CATEGORY_COMPETITION es 10468 y el índice muestra sus equipos e inscripciones.
R2. Existe como máximo una fila de catálogo por category_competition_id; la migración fusiona duplicados conservando monitored=true, relación de temporada y cambios auditables.
R3. Los IDs opacos siguen almacenándose como metadato externo pero nunca se usan para enlazar catálogo con temporada.
R4. Una respuesta de estadísticas con resultado=error y error=Id no válido se clasifica como MATCH_UNAVAILABLE sin exponer el payload.
R5. Un partido rechazado incrementa rejected y no impide procesar otros partidos ni hace fallar la fase stats.
R6. Tras tres respuestas MATCH_UNAVAILABLE persistidas para el mismo partido, el juego pasa a sync_status=stale y deja de ser elegible; antes del umbral permanece reintentable.
R7. Otros FabResponseError conservan el fallo de fase actual y no se silencian.
R8. La corrección es idempotente, preserva RAW saneado y pasa tests Python, web, Prisma y diff-scope.

