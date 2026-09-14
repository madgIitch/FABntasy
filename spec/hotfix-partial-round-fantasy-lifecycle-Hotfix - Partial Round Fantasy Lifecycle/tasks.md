# hotfix-partial-round-fantasy-lifecycle · Procesamiento fantasy de jornadas parcialmente sincronizadas — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) Una jornada con al menos un partido finished, hasStatistics=true y statsSyncStatus=stats_final es elegible aunque otro partido de la misma jornada permanezca pending.  ↔ R1
- [x] (T2) Una jornada sin ningún partido stats_final no es elegible para publicación ni actualización de precios.  ↔ R2
- [x] (T3) El recálculo solo consume estadísticas persistidas disponibles; no crea puntuaciones para partidos pendientes ni inventa datos.  ↔ R3
- [x] (T4) Cuando un partido pendiente pase posteriormente a stats_final, una nueva ejecución lo incorpora sin duplicar revisiones vigentes ni transacciones de precio.  ↔ R4
- [x] (T5) Los tests cubren jornadas completas, parcialmente sincronizadas y sin estadísticas finales.  ↔ R5
- [x] Tests que cubran los criterios de aceptación
