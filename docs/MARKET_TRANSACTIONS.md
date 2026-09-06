# Mercado, transacciones y cláusulas

El mercado funciona dentro de una liga privada. Un jugador puede tener como máximo un propietario por liga, aunque su valor de mercado continúa siendo global para toda la competición-temporada.

## Economía

El saldo inicial es el presupuesto del ruleset menos la suma de los precios de adquisición de la plantilla. Cada movimiento genera una entrada inmutable en `fantasy_budget_ledger`; `fantasy_teams.balance_credits` es su proyección transaccional para lectura rápida.

- Compra libre: valor global vigente.
- Venta: valor global vigente; el jugador vuelve a quedar libre.
- Cláusula base: `1,75 × max(precio pagado, valor vigente)` con redondeo half-up al crédito.
- Inversión: cada crédito gastado añade dos créditos a la cláusula. No se reembolsa y desaparece cuando cambia el propietario.
- Clausulazo: no rechazable y el 100 % llega al propietario anterior.

## Protecciones

Cada usuario dispone de un blindaje de 24 horas por jornada. Una adquisición queda protegida hasta la siguiente jornada. Solo se permite un clausulazo realizado y uno recibido por jornada; al recibirlo, el resto del equipo queda protegido hasta la siguiente jornada.

Los clausulazos cierran 24 horas antes del primer partido autoritativo de la próxima jornada. Las alineaciones congeladas son snapshots y no se modifican por movimientos posteriores.

## API

`GET /api/fantasy/market?leagueId=<uuid>` devuelve saldo, propiedad, jornada y cutoff. `POST /api/fantasy/market` recibe `leagueId`, `playerRegistrationId`, `action`, `idempotencyKey` y, para `INVEST`, `credits`. Las acciones son `BUY`, `SELL`, `CLAUSE`, `INVEST` y `SHIELD`.

El contrato usa `fantasy-market-api.v1`; la identidad procede siempre de Supabase Auth. Todas las mutaciones se ejecutan con aislamiento serializable y un lock por liga.
