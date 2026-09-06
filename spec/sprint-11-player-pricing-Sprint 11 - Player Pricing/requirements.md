# sprint-11-player-pricing · undefined — Requisitos

- name: `Sprint 11 - Player Pricing` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-06T00:57:00.697Z

## Contexto



## Requisitos funcionales

R1. AC1: Cada playerRegistration elegible comienza con un precio global provisional de 5.000.000 créditos, compartido por todas las ligas privadas, y tiene como máximo un precio vigente por competitionSeason y versión.
R2. AC2: Cada cálculo registra un PriceEvent inmutable con periodo, inputs, forma, media, rating, percentil, objetivo, precio anterior/nuevo, límites, motivo y versión.
R3. AC3: La forma pondera las tres últimas actuaciones fantasy definitivas 50/30/20, renormaliza pesos con una o dos, y el rating combina 70% forma con 30% media de temporada.
R4. AC4: Con al menos 20 jugadores calculables, el objetivo interpola linealmente la curva percentil/precio 0→2 M, 20→3 M, 40→6 M, 60→9 M, 80→14 M, 95→18 M y 100→22 M; empates comparten percentil medio.
R5. AC5: Con una cohorte menor de 20, el precio permanece provisional en 5 M y se informa INSUFFICIENT_MARKET_SAMPLE.
R6. AC6: La convergencia usa alpha 0,50 durante las tres primeras jornadas confirmadas y 0,25 después; cada cambio queda limitado a +12% y -10% por jornada.
R7. AC7: Un partido aplazado o sin partido no cambia el precio. Un DNP no entra como cero y aplica -2%, -3% o -4% según sea el primero, segundo o tercer DNP consecutivo, con suelo de 2 M.
R8. AC8: Si el producto arranca con jornadas disputadas, reconstruye precios cronológicamente desde 5 M usando las mismas reglas y eventos que una ejecución ordinaria.
R9. AC9: Los importes se persisten como enteros y el resultado final se redondea half-up al crédito, sin redondeos intermedios.
R10. AC10: Repetir competitionSeason, roundNumber, algorithmVersion y la misma revisión de inputs no duplica eventos ni cambia el resultado.
R11. AC11: Una corrección de scores crea una revisión auditable del periodo sin borrar eventos previos ni modificar puntuaciones fantasy; una ejecución fallida no publica parcialmente la cohorte.
R12. AC12: Compras, ventas, propiedad y demanda no afectan al precio en v1; popularidad y porcentaje de propiedad pueden mostrarse como información separada.
R13. AC13: La cláusula base es 175% de max(precio pagado, precio vigente), redondeada half-up; el precio pagado sigue siendo el coste histórico de plantilla y la plusvalía es precio vigente menos precio pagado.
R14. AC14: Sprint 11 no vende, mueve saldo, incrementa cláusulas ni transfiere jugadores; esas operaciones quedan para Sprint 13.
R15. AC15: La lectura global devuelve precio, estado provisional/confirmado, variación, tendencia, máximo, mínimo, periodo y versión sin secretos ni RAW.
R16. AC16: La UI muestra La Bolsa Canastio, precio, plusvalía cuando proceda, tendencia e histórico como créditos de juego, con estados legibles desde 320 px y sin presentarlo como dinero o asesoramiento real.
R17. AC17: Tests cubren cold start, percentiles, empates, muestra insuficiente, ventanas, límites, redondeo, DNP consecutivo, aplazamiento, backfill, idempotencia, concurrencia, revisiones y cláusula base sin red FAB.

## Restricciones

- **error_states:** Códigos estables y ausencia sin ceros inventados.
- **auth_secrets:** Cálculo exclusivamente server-side sin secretos nuevos.
- **rollback_compat:** Datos aditivos y fallback cold-start.

