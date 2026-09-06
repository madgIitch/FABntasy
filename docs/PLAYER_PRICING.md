# Precios de jugadores

## Contrato v1

El valor de mercado es global para una `PlayerRegistration` y una temporada, independientemente de las ligas privadas en las que aparezca. Comienza provisionalmente en 5.000.000 de créditos y solo usa puntos fantasy normalizados persistidos; compras, ventas, propiedad y popularidad no intervienen.

La forma reciente pondera las tres últimas actuaciones 50/30/20 y renormaliza los pesos si solo existen una o dos. El rating mezcla 70% de forma y 30% de media de temporada. Con al menos 20 jugadores calculables, el percentil de ese rating se interpola en esta curva:

| Percentil | Precio objetivo |
|---:|---:|
| 0 | 2 M |
| 20 | 3 M |
| 40 | 6 M |
| 60 | 9 M |
| 80 | 14 M |
| 95 | 18 M |
| 100 | 22 M |

Los empates comparten el percentil medio. La convergencia usa alpha 0,50 durante las tres primeras jornadas confirmadas y 0,25 después, con variación máxima de +12% y -10% por jornada. Los importes se redondean `half-up` al crédito al final.

Un partido aplazado no mueve el precio. Un DNP no entra en las medias y aplica -2%, -3% o -4% según la racha consecutiva. El backfill ejecuta las jornadas cronológicamente desde el cold start.

## Persistencia y API

`player_prices` contiene la proyección vigente. `player_price_events` conserva eventos aditivos por jornada, versión y hash de inputs; una corrección crea una revisión nueva. La cohorte se publica en una transacción serializable protegida por advisory lock.

`GET /api/fantasy/prices?competitionSeasonId=<uuid>` devuelve `{ schemaVersion: "player-price-api.v1", items }`. Puede filtrarse por `playerRegistrationId` y `algorithmVersion`.

La cláusula base es `1,75 × max(precio pagado, precio vigente)`. En este sprint es un cálculo puro: las transferencias, inversiones y movimientos de saldo pertenecen al Sprint 13.
