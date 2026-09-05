# Fantasy scoring v1

## Rulesets oficiales e inmutabilidad

La versión inicial publica identificadores estables:

- `canastio.provincial.player-game@1.0.0`: `PTS + 0.50×3PM + 0.25×FTM - 0.50×FC`.
- `canastio.national.player-game@1.0.0`: `PTS + 1.20×REB + 1.50×AST + 3.00×STL + 3.00×BLK - 1.50×TO - 0.50×(FGA-FGM) - 0.50×(FTA-FTM) - 0.50×FC`.

No hay bonus en v1 y el raw puede ser negativo. Un campo requerido `null` produce `NOT_CALCULABLE/MISSING_REQUIRED_STAT`, con ambos scores `null`; un campo no usado puede ser `null`. DNP exige minutos y todos los campos del snapshot presentes e iguales a cero, produce `0.0 FP` y no entra en la población.

La población son las actuaciones calculables, no-DNP, de la misma temporada competitiva y jornada. Con al menos 20 se usa desviación estándar poblacional y `clamp(20 + 10×Z, 0, 50)`. Una muestra menor produce `PENDING/INSUFFICIENT_NORMALIZATION_SAMPLE`; desviación cero produce `PENDING/ZERO_NORMALIZATION_DEVIATION`. Todas las operaciones usan Decimal y solo raw y FP se redondean al final, a una decimal y half-up.

Ejemplos oficiales: provincial `PTS=20, 3PM=2, FTM=4, FC=3 → raw=20.5`; nacional `PTS=20, REB=8, AST=5, STL=2, BLK=1, TO=3, FGM=7, FGA=15, FTM=4, FTA=6, FC=3 → raw=35.1`. Con media 20/desviación 10, 20.5 da 20.5 FP; con media 25/desviación 10, 35.1 da 30.1 FP.

## Snapshot, hash y breakdown

`player-game-stat.v1` serializa en orden fijo identidad, temporada/jornada y todos los campos estadísticos como strings decimales o `null`. `source_stats_version` es el SHA-256 hexadecimal de ese JSON UTF-8. El breakdown `fantasy-breakdown.v1` conserva el orden del ruleset, valor original incluido `null`, expresión, coeficiente/condición, contribución sin redondear y contribución presentada. El raw se obtiene sumando contribuciones sin redondear; nunca se suman las presentadas.

## API server-side

`GET /api/fantasy/scores` requiere `rulesetId` o `rulesetVersion`; omitir ambos devuelve `400 RULESET_VERSION_REQUIRED`. Acepta `playerId` y `gameId` como filtros. Devuelve `{ schemaVersion: "fantasy-score-api.v1", items }`, donde cada elemento incluye `status`, `errorCode`, IDs de jugador/partido/competición/temporada, `rawScore`, `normalizedFantasyPoints`, `rulesetId`, `rulesetVersion`, `sourceStatsVersion`, `recalculated` y `breakdown`. Scores no disponibles son `null`. El contrato v1 es aditivo: nuevos campos pueden añadirse, pero los existentes no cambian de significado. No contiene RAW ni secretos FAB.

## Publicación, recomputación y rollback

`publishOfficialV1` inserta idempotentemente una definición publicada. `recomputeRound` es la unidad transaccional: calcula toda una jornada con aislamiento serializable, reintenta conflictos y usa la constraint de inputs para convergencia concurrente. Una corrección genera otro hash y otra fila; una versión nueva usa otro ruleset y conserva las anteriores.

Para cambiar la activa se invoca `activateRuleSet(ruleSetId, actor, reason)`. La operación desactiva la actual, activa la seleccionada y registra el actor/motivo en la misma transacción. Volver a una anterior usa la misma operación y queda como `REACTIVATED`. `retireRuleSet` marca `RETIRED` y registra el evento: no borra definición ni puntuaciones. Para rollback operativo, seleccione explícitamente el ID de la versión anterior y actívelo con un motivo; nunca edite una definición publicada.
