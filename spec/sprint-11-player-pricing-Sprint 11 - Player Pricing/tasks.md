# sprint-11-player-pricing Â· undefined â€” Tareas

Checklist de implementaciÃ³n. El agente marca [x] al completar; los gates verifican.

- [x] (T1) AC1: Cada playerRegistration elegible comienza con un precio global provisional de 5.000.000 crÃ©ditos, compartido por todas las ligas privadas, y tiene como mÃ¡ximo un precio vigente por competitionSeason y versiÃ³n.  â†” R1
- [x] (T2) AC2: Cada cÃ¡lculo registra un PriceEvent inmutable con periodo, inputs, forma, media, rating, percentil, objetivo, precio anterior/nuevo, lÃ­mites, motivo y versiÃ³n.  â†” R2
- [x] (T3) AC3: La forma pondera las tres Ãºltimas actuaciones fantasy definitivas 50/30/20, renormaliza pesos con una o dos, y el rating combina 70% forma con 30% media de temporada.  â†” R3
- [x] (T4) AC4: Con al menos 20 jugadores calculables, el objetivo interpola linealmente la curva percentil/precio 0â†’2 M, 20â†’3 M, 40â†’6 M, 60â†’9 M, 80â†’14 M, 95â†’18 M y 100â†’22 M; empates comparten percentil medio.  â†” R4
- [x] (T5) AC5: Con una cohorte menor de 20, el precio permanece provisional en 5 M y se informa INSUFFICIENT_MARKET_SAMPLE.  â†” R5
- [x] (T6) AC6: La convergencia usa alpha 0,50 durante las tres primeras jornadas confirmadas y 0,25 despuÃ©s; cada cambio queda limitado a +12% y -10% por jornada.  â†” R6
- [x] (T7) AC7: Un partido aplazado o sin partido no cambia el precio. Un DNP no entra como cero y aplica -2%, -3% o -4% segÃºn sea el primero, segundo o tercer DNP consecutivo, con suelo de 2 M.  â†” R7
- [x] (T8) AC8: Si el producto arranca con jornadas disputadas, reconstruye precios cronolÃ³gicamente desde 5 M usando las mismas reglas y eventos que una ejecuciÃ³n ordinaria.  â†” R8
- [x] (T9) AC9: Los importes se persisten como enteros y el resultado final se redondea half-up al crÃ©dito, sin redondeos intermedios.  â†” R9
- [x] (T10) AC10: Repetir competitionSeason, roundNumber, algorithmVersion y la misma revisiÃ³n de inputs no duplica eventos ni cambia el resultado.  â†” R10
- [x] (T11) AC11: Una correcciÃ³n de scores crea una revisiÃ³n auditable del periodo sin borrar eventos previos ni modificar puntuaciones fantasy; una ejecuciÃ³n fallida no publica parcialmente la cohorte.  â†” R11
- [x] (T12) AC12: Compras, ventas, propiedad y demanda no afectan al precio en v1; popularidad y porcentaje de propiedad pueden mostrarse como informaciÃ³n separada.  â†” R12
- [x] (T13) AC13: La clÃ¡usula base es 175% de max(precio pagado, precio vigente), redondeada half-up; el precio pagado sigue siendo el coste histÃ³rico de plantilla y la plusvalÃ­a es precio vigente menos precio pagado.  â†” R13
- [x] (T14) AC14: Sprint 11 no vende, mueve saldo, incrementa clÃ¡usulas ni transfiere jugadores; esas operaciones quedan para Sprint 13.  â†” R14
- [x] (T15) AC15: La lectura global devuelve precio, estado provisional/confirmado, variaciÃ³n, tendencia, mÃ¡ximo, mÃ­nimo, periodo y versiÃ³n sin secretos ni RAW.  â†” R15
- [x] (T16) AC16: La UI muestra La Bolsa Canastio, precio, plusvalÃ­a cuando proceda, tendencia e histÃ³rico como crÃ©ditos de juego, con estados legibles desde 320 px y sin presentarlo como dinero o asesoramiento real.  â†” R16
- [x] (T17) AC17: Tests cubren cold start, percentiles, empates, muestra insuficiente, ventanas, lÃ­mites, redondeo, DNP consecutivo, aplazamiento, backfill, idempotencia, concurrencia, revisiones y clÃ¡usula base sin red FAB.  â†” R17
- [x] Tests que cubran los criterios de aceptaciÃ³n

