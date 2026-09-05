# sprint-10-fantasy-team-roster · undefined — Diseño

## Scope (archivos que puede tocar)

- `prisma/**`
- `packages/domain/**`
- `apps/web/src/server/**`
- `apps/web/src/app/**`
- `apps/web/src/components/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** Se define una FantasyTeam única por usuario y competitionSeason, una plantilla exacta de 7 jugadores con 5 titulares y 2 suplentes, sin posiciones, un máximo de 2 jugadores por equipo real y unicidad de jugador en plantilla y snapshot. La fuente autoritativa inicial es el ruleset cold-start, que asigna 3000000 créditos a todos los jugadores. El acquisition_price se captura dentro de la transacción que confirma el roster y permanece inmutable. Cuando Sprint 11 active precios dinámicos, se captura el precio vigente persistido y la ausencia de precio se rechaza con 409 PRICE_UNAVAILABLE.
- **external_contracts:** Se especifican métodos, rutas, queries y requests de los GET y PUT, el envelope fantasy-team-api.v1, expectedVersion, importes enteros en créditos, timestamps ISO 8601 UTC, nullabilidad y códigos de error. Los GET correctos devuelven 200, el PUT de creación inicial 201 y el PUT de reemplazo 200. Cada elemento de roster contiene playerRegistrationId, playerId, displayName, realTeamId, realTeamName, acquisitionPrice y currentMarketPrice; solo currentMarketPrice puede ser null. lineup es null o contiene roundNumber, status, cutoffAt, lockedAt, starters y substitutes; status es DRAFT o LOCKED, lockedAt es null en DRAFT e ISO UTC en LOCKED, y starters y substitutes contienen snapshots con los mismos campos del roster.
- **edge_cases:** El bloqueo es inclusivo. El instante decisivo es clock_timestamp() de PostgreSQL leído dentro de la transacción, tras bloquear la jornada e inmediatamente antes de persistir, por lo que una petición iniciada antes del cutoff puede ser rechazada si llega a ese punto en o después del cierre. El cutoff se recalcula por reprogramaciones anteriores al cierre, se fija al bloquearse, nunca reabre y su ausencia produce 409 CUTOFF_UNAVAILABLE.
- **ui_states:** La UI contempla carga, vacío guiado, guardado, éxito, validación, conflicto y alineación bloqueada. Ante VERSION_CONFLICT conserva el borrador hasta que el usuario recarga o reaplica, sin reintento automático. Offline no envía ni encola cambios y conserva solo el borrador local. Con la feature desactivada, los datos históricos permanecen en solo lectura.

## Decisiones de la entrevista

- **adv-904f0399bd:** ### [adv-13853102c3] No se define qué precio es aplicable a cada incorporación: fuente autoritativa, instante de captura y resultado cuando el precio cambia o no existe durante la transacción.

**R:**
- **adv-71f452521c:** ### [adv-7fed0f0c0e] No se precisa cuándo se crea el snapshot inmutable ni qué ocurre con varios guardados antes del cutoff: reemplazar el borrador, conservar versiones sucesivas o congelar únicamente la última alineación al cierre.

**R:**
- **adv-fc3364b986:** ### [adv-e145dfa794] No se define el comportamiento observable de los estados offline y conflicto: conservación del borrador, reintento o cola automática, y mecanismo de resolución del conflicto.

**R:**
- **adv-241104ccda:** ## Decisiones registradas
- **data_model:** La fuente autoritativa inicial es el ruleset cold-start documentado: 3000000 créditos para todos los jugadores. Se captura como acquisition_price dentro de la transacción que confirma el roster y nunca cambia. Cuando Sprint 11 active precios dinámicos, se captura el precio vigente persistido; si ese modo está activo y falta precio, se rechaza con 409 PRICE_UNAVAILABLE.
- **external_contracts:** Los GET correctos devuelven 200; el PUT de creación inicial 201 y el PUT de reemplazo 200. Cada elemento de roster contiene `{playerRegistrationId,playerId,displayName,realTeamId,realTeamName,acquisitionPrice,currentMarketPrice}`; solo currentMarketPrice puede ser null. `lineup` es null o `{roundNumber,status,cutoffAt,lockedAt,starters,substitutes}`; status es DRAFT o LOCKED, cutoffAt es ISO UTC, lockedAt es null en DRAFT e ISO UTC en LOCKED, y starters/substitutes contienen snapshots con los mismos campos del roster. Se mantienen las rutas y payloads ya definidos, el envelope fantasy-team-api.v1, importes enteros, expectedVersion, manejo manual de conflictos, borrador local offline sin cola y FEATURE_DISABLED con GET histórico 200 y PUT 409.

