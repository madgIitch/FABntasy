# hotfix-partial-round-fantasy-lifecycle · Procesamiento fantasy de jornadas parcialmente sincronizadas — Requisitos

- name: `Hotfix - Partial Round Fantasy Lifecycle` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-14T12:16:40.374Z

## Contexto

Permitir que el lifecycle calcule puntuaciones, forma y precios para los partidos finalizados con estadísticas válidas aunque otro partido de la misma jornada continúe pendiente por una incidencia de FAB.

## Requisitos funcionales

R1. Una jornada con al menos un partido finished, hasStatistics=true y statsSyncStatus=stats_final es elegible aunque otro partido de la misma jornada permanezca pending.
R2. Una jornada sin ningún partido stats_final no es elegible para publicación ni actualización de precios.
R3. El recálculo solo consume estadísticas persistidas disponibles; no crea puntuaciones para partidos pendientes ni inventa datos.
R4. Cuando un partido pendiente pase posteriormente a stats_final, una nueva ejecución lo incorpora sin duplicar revisiones vigentes ni transacciones de precio.
R5. Los tests cubren jornadas completas, parcialmente sincronizadas y sin estadísticas finales.

## Restricciones

- **error_states:** Un partido pendiente permanece sin puntuación y puede incorporarse en una ejecución posterior.
- **auth_secrets:** No cambia autenticación, secretos ni contratos internos protegidos.
- **rollback_compat:** El cambio es reversible y no altera el esquema ni elimina revisiones históricas.

