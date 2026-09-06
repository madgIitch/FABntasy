# sprint-11-player-pricing · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** Precio vigente separado de eventos históricos y de la cláusula derivada.
- **external_contracts:** Job, lectura y función de cláusula definidos.
- **edge_cases:** Cold start, ventanas, límites, redondeo y correcciones decididos.
- **ui_states:** Estados y responsive definidos.

## Decisiones de la entrevista

- **data_model:** PlayerPrice conserva un precio global de Canastio por playerRegistration y competitionSeason, compartido por todas las ligas privadas. PriceEvent es aditivo e inmutable y registra periodo, precio anterior/nuevo, forma reciente, media de temporada, rating de mercado, percentil, precio objetivo, límite aplicado, versión y snapshot de inputs. Precio pagado, propietario y cláusula son datos por liga y no alteran este precio global. La cláusula base se calcula como 175% de max(acquisitionPrice, marketPrice). La inversión de saldo y su incremento 1:2 pertenecen al Sprint 13, cuando exista ledger.
- **error_states:** Sin precio inicializable se devuelve PRICE_UNAVAILABLE. Un partido aplazado o una jornada sin partido no cambia el precio y queda como NO_SCHEDULED_GAME. Un DNP aplica una presión bajista explícita, no un score cero. Sin una cohorte mínima de 20 jugadores calculables el precio provisional se mantiene como INSUFFICIENT_MARKET_SAMPLE. Inputs, versiones o periodos inválidos fallan sin escrituras parciales. La UI distingue carga, precio provisional, sin variación, tendencia y error.
- **edge_cases:** Cold start provisional de 5.000.000 créditos. Solo cuentan FP normalizados definitivos de partidos disputados. Forma reciente pondera las tres últimas actuaciones 50/30/20, renormalizando los pesos cuando hay una o dos. Rating de mercado = 70% forma reciente + 30% media de temporada. El jugador se ordena por rating dentro de su competitionSeason y su precio objetivo se obtiene por interpolación lineal en la curva percentil/precio: 0→2 M, 20→3 M, 40→6 M, 60→9 M, 80→14 M, 95→18 M y 100→22 M. Empates reciben el mismo percentil medio y objetivo. Durante las tres primeras jornadas confirmadas el precio converge con alpha 0,50; después con 0,25. La variación confirmada se limita a +12% y -10% por jornada. Primer DNP consecutivo: -2%; segundo: -3%; tercero y posteriores: -4%, siempre sujeto al suelo de 2 M y sin introducir el DNP en medias. Partido aplazado: 0%. Todos los resultados se redondean half-up al crédito entero. Si Canastio arranca con jornadas ya disputadas, se hace un backfill cronológico desde 5 M aplicando las mismas reglas, sin saltar directamente al objetivo. Correcciones crean una revisión auditable del mismo periodo sin borrar la previa.
- **auth_secrets:** El job y las lecturas operan server-side sobre scores persistidos. No reciben userId arbitrario ni acceden a FAB. API, logs, eventos y snapshots no contienen credenciales, RAW ni datos privados de sesión.
- **external_contracts:** El job actualiza una competitionSeason y roundNumber explícitos con algorithmVersion y publica atómicamente toda la cohorte. La lectura global devuelve importes enteros, moneda virtual en créditos, estado provisional/confirmado, variación, tendencia, máximo, mínimo, timestamp, periodo y versión. Sprint 10 obtiene el precio vigente desde esta fuente. El contrato de cláusula expone una función determinista sobre acquisitionPrice y marketPrice; no mueve saldo ni jugadores.
- **ui_states:** La Bolsa Canastio y la ficha muestran precio actual, precio pagado cuando exista contexto de equipo, plusvalía, cambio absoluto y porcentual, propiedad/popularidad solo informativa, tendencia, máximo, mínimo y gráfica histórica compacta. Las etiquetas COMPRAR/MANTENER/VENDER son acciones o contexto editorial y nunca asesoramiento financiero. No usan símbolos ni textos que impliquen dinero real. En 320–430 px no hay scroll horizontal involuntario y loading, provisional, vacío y error se distinguen por texto.
- **rollback_compat:** Migración aditiva. Desactivar precios dinámicos mantiene lecturas históricas y hace que Sprint 10 use el cold start existente. PriceEvent nunca se reescribe ni elimina. El scoring no se modifica y cada versión del algoritmo conserva resultados reproducibles.
- **tests:** Tests puros cubren ventanas, ponderaciones, target, alpha, clamps, redondeo, DNP y cláusula. PostgreSQL real cubre unicidad, idempotencia, concurrencia, revisiones y rollback. Tests de API/UI cubren contrato y estados sin red FAB.

