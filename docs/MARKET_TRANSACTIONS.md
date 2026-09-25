# Mercado, transacciones y cláusulas

El mercado funciona dentro de una liga privada. Un jugador puede tener como máximo un propietario por liga, aunque su valor de mercado continúa siendo global para toda la competición-temporada.

## Economía

El saldo inicial es el presupuesto del ruleset menos la suma de los precios de adquisición de la plantilla. Cada movimiento genera una entrada inmutable en `fantasy_budget_ledger`; `fantasy_teams.balance_credits` es su proyección transaccional para lectura rápida.

- Compra libre: valor global vigente.
- Venta inmediata: 80 % del valor global vigente, cotizado y confirmado por el servidor; el jugador vuelve a quedar libre.
- Venta al sistema por anuncio: Canastio ofrece el 100 % del valor vigente al inicio del siguiente ciclo diario y renueva la oferta en cada ciclo mientras el anuncio siga activo.
- Traspaso entre mánagers: importe de la propuesta privada aceptada por ambas partes.
- Cláusula base: `1,75 × max(precio pagado, valor vigente)` con redondeo half-up al crédito.
- Inversión: cada crédito gastado añade dos créditos a la cláusula. No se reembolsa y desaparece cuando cambia el propietario.
- Clausulazo: no rechazable y el 100 % llega al propietario anterior.

## Protecciones

Cada usuario dispone de un blindaje de 24 horas por jornada. Una adquisición queda protegida hasta la siguiente jornada. Solo se permite un clausulazo realizado y uno recibido por jornada; al recibirlo, el resto del equipo queda protegido hasta la siguiente jornada.

Los clausulazos cierran 24 horas antes del primer partido autoritativo de la próxima jornada. Las alineaciones congeladas son snapshots y no se modifican por movimientos posteriores.

## API

`GET /api/fantasy/market?leagueId=<uuid>` devuelve saldo, propiedad, jornada y cutoff. `POST /api/fantasy/market` recibe `leagueId`, `playerRegistrationId`, `action`, `idempotencyKey` y, para `INVEST`, `credits`. Las acciones vigentes son `BUY`, `CLAUSE`, `INVEST` y `SHIELD`; `SELL` responde `USE_INSTANT_SALE` para impedir la antigua venta al 100 %.

`GET /api/fantasy/market/negotiations?leagueId=<uuid>` devuelve anuncios públicos de la liga, las negociaciones privadas del usuario y cotizaciones de venta inmediata de sus jugadores. `POST` acepta `LIST`, `UNLIST`, `OFFER`, `COUNTER`, `ACCEPT`, `REJECT`, `ACCEPT_SYSTEM` e `INSTANT_SELL`, con clave de idempotencia. Las ofertas privadas duran 48 horas desde la última propuesta; los anuncios duran 72 horas. Las ofertas de compra hechas por el comprador reservan saldo y hueco junto con las pujas del mercado diario. Una contraoferta del vendedor se revalida cuando el comprador la acepta. El clausulazo por un jugador con oferta propia activa sustituye esa reserva y la invalida al cambiar de propietario.

El contrato usa `fantasy-market-api.v1`; la identidad procede siempre de Supabase Auth. Todas las mutaciones se ejecutan con aislamiento serializable y un lock por liga.
