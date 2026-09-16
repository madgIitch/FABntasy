# sprint-31-catalog-link-and-retired-games · Recuperación de datos monitorizados y partidos retirados — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) Una fila de catálogo con category_competition_id 10468 queda enlazada a la CompetitionSeason cuyo external_id FAB_CATEGORY_COMPETITION es 10468 y el índice muestra sus equipos e inscripciones.  ↔ R1
- [ ] (T2) Existe como máximo una fila de catálogo por category_competition_id; la migración fusiona duplicados conservando monitored=true, relación de temporada y cambios auditables.  ↔ R2
- [ ] (T3) Los IDs opacos siguen almacenándose como metadato externo pero nunca se usan para enlazar catálogo con temporada.  ↔ R3
- [ ] (T4) Una respuesta de estadísticas con resultado=error y error=Id no válido se clasifica como MATCH_UNAVAILABLE sin exponer el payload.  ↔ R4
- [ ] (T5) Un partido rechazado incrementa rejected y no impide procesar otros partidos ni hace fallar la fase stats.  ↔ R5
- [ ] (T6) Tras tres respuestas MATCH_UNAVAILABLE persistidas para el mismo partido, el juego pasa a sync_status=stale y deja de ser elegible; antes del umbral permanece reintentable.  ↔ R6
- [ ] (T7) Otros FabResponseError conservan el fallo de fase actual y no se silencian.  ↔ R7
- [ ] (T8) La corrección es idempotente, preserva RAW saneado y pasa tests Python, web, Prisma y diff-scope.  ↔ R8
- [ ] Tests que cubran los criterios de aceptación
