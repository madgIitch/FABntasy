# sprint-14-round-scoring-rankings · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** Se persisten resultados por equipo, liga, jornada, revisión e inputs versionados; los totales se derivan de jornadas publicadas y conservan trazabilidad.
- **external_contracts:** API versionada para historial, detalle de jornada y rankings global y privado, con revisión, estado, timestamps UTC y paginación estable.
- **edge_cases:** Se cubren DNP a cero, titulares sin score calculable, jornadas aplazadas, equipos creados tarde, empates completos, reintentos y recomputaciones.
- **ui_states:** La UI muestra jornada, acumulado, posición, variación, desglose de cinco titulares y estados vacío, provisional, recalculando, error y offline.

## Decisiones de la entrevista

- **scoring_lineup:** Puntúan exclusivamente los cinco titulares del snapshot congelado de la jornada. Los dos suplentes no puntúan ni sustituyen automáticamente a nadie. Un titular que no disputa su partido aporta cero puntos.
- **ranking_tiebreak:** Los empates en puntos acumulados se resuelven por más puntos en la última jornada computada, después por la mayor puntuación individual de jornada alcanzada y finalmente por la fecha de creación del equipo, ganando el más antiguo. Como último criterio técnico se usa el identificador estable del equipo en orden ascendente.

