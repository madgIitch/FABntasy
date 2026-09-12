# Referencias reales para equilibrado fantasy

Este documento conserva observaciones de partidos reales ya ingeridos. No define ni modifica reglas: es memoria empírica para calibrar versiones futuras mediante specs aprobados.

## Baseline N1-2026-09-11-001

Instantánea consultada el 12/09/2026 desde PostgreSQL.

- Competición: `COPA DELEGACIÓN 2026`
- Categoría FAB: `LIGA NACIONAL N1 MAS`
- Temporada: `2026/2027`
- Partido: CB Fresas - SAFA Reyes Sevilla 81–75 Club Náutico Sevilla
- Inicio: `2026-09-11T18:00:00.000Z`
- `games.id`: `28d83a0a-9086-47d8-a0d9-1b84fa3a4ed4`
- Estado al capturar: `finished`, `stats_sync_status=partial`
- Última sincronización estadística: `2026-09-11T19:43:04.994Z`
- Filas almacenadas: 26; actuaciones individuales útiles: 24.

### Regla de lectura

FAB incluye una fila `TOTALES` por equipo. Actualmente ambas están persistidas como jugadores. Deben excluirse de cualquier población, normalización, ranking, precio o cálculo fantasy. Los totales oficiales sí sirven como control: 200 minutos y 81 puntos para CB Fresas; 200 minutos y 75 puntos para Club Náutico.

La instantánea es provisional porque la ingesta todavía figura como `partial`. Antes de usarla como fixture dorada o aceptar conclusiones definitivas, hay que volver a compararla cuando el partido sea `stats_final`.

### Aplicación exploratoria de la fórmula Nacional v1

Se aplicó, sin cambiar datos ni reglas, la fórmula documentada:

`RawNac = PTS + 1.20×REB + 1.50×AST + 3.00×STL + 3.00×BLK - 1.50×TO - 0.50×(FGA-FGM) - 0.50×(FTA-FTM) - 0.50×FC`

Sobre las 24 actuaciones reales:

- media raw: `10.754`
- desviación estándar poblacional: `8.789`
- mediana: `11.0`
- rango: `-2.5` a `31.1`
- actuaciones negativas: `3/24` (12,5 %)
- suma raw por equipo: CB Fresas `131.2`; Club Náutico `126.9`
- valoración FAB por equipo: CB Fresas `94`; Club Náutico `62`

Con la normalización v1 (`20 + 10×Z`, limitada a 0–50), este partido aislado ya supera la muestra mínima de 20, pero no es una jornada completa y por tanto no representa la población normativa real. Sirve para detectar escala, outliers y sensibilidad de coeficientes, no para publicar puntos.

### Actuaciones

Ordenadas por `RawNac`. `MIN` está expresado en minutos decimales. Esta tabla conserva los términos principales de equilibrado; el boxscore completo permanece en `player_game_stats` bajo el `games.id` anterior.

| Equipo | Jugador | MIN | PTS | REB | AST | STL | BLK | TO | FC | VAL | +/- | RawNac |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CB Fresas | Eduardo Roca Portillo | 23.833 | 14 | 18 | 2 | 2 | 0 | 7 | 2 | 25 | 26 | 31.1 |
| CB Fresas | Yeico Martín Arguelle | 26.383 | 22 | 6 | 0 | 2 | 0 | 2 | 0 | 22 | 24 | 27.7 |
| Club Náutico | Pablo Rodríguez Rueda | 18.133 | 8 | 7 | 1 | 2 | 0 | 1 | 1 | 11 | 14 | 18.9 |
| Club Náutico | Diego Orta Victoria | 25.567 | 3 | 4 | 3 | 4 | 0 | 2 | 4 | 10 | -5 | 18.8 |
| Club Náutico | Esteban Mula Pérez-Leiva | 28.450 | 25 | 2 | 0 | 1 | 0 | 1 | 4 | 10 | 5 | 18.4 |
| Club Náutico | Jesús Palacios Calatayud | 23.533 | 6 | 2 | 3 | 4 | 0 | 3 | 2 | 7 | -20 | 17.4 |
| CB Fresas | Nicolás Nieves Cubero | 21.067 | 3 | 3 | 3 | 3 | 0 | 1 | 2 | 9 | 26 | 17.1 |
| CB Fresas | Javier Rodríguez Fernández | 23.067 | 11 | 3 | 3 | 0 | 0 | 0 | 1 | 12 | 19 | 16.6 |
| Club Náutico | Marco Rodríguez Lara | 28.300 | 16 | 0 | 4 | 1 | 0 | 4 | 1 | 10 | -21 | 14.0 |
| CB Fresas | Ángel Pérez Castro | 22.300 | 12 | 8 | 1 | 0 | 0 | 3 | 3 | 11 | 28 | 13.1 |
| CB Fresas | Daniel Monclova Cuesta | 15.033 | 4 | 8 | 0 | 1 | 0 | 2 | 1 | 9 | -19 | 12.6 |
| Club Náutico | Rafael Duque Gutiérrez | 21.483 | 4 | 4 | 2 | 1 | 1 | 3 | 1 | 6 | -5 | 11.3 |
| Club Náutico | Guillermo Campoy Garcia-Trevijano | 14.217 | 3 | 1 | 0 | 2 | 1 | 0 | 0 | 2 | 15 | 10.7 |
| CB Fresas | Pablo Macua Monclova | 16.500 | 7 | 2 | 3 | 2 | 0 | 4 | 2 | 1 | 4 | 8.4 |
| Club Náutico | Francisco Javier Sánchez Sánchez | 6.617 | 6 | 1 | 1 | 1 | 0 | 0 | 3 | 3 | 0 | 8.2 |
| Club Náutico | Francisco Javier Ramírez Leiva | 3.850 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 4 | 3 | 4.4 |
| CB Fresas | Esteban Senra González | 10.867 | 3 | 2 | 0 | 0 | 0 | 0 | 0 | 3 | -22 | 4.4 |
| Club Náutico | Javier Díaz Sebastián | 9.717 | 2 | 3 | 0 | 0 | 0 | 0 | 1 | 1 | 3 | 3.6 |
| Club Náutico | Mario Chaín Roldán | 2.650 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | -2 | 3.0 |
| CB Fresas | Enrique Flores Saucedo | 9.867 | 2 | 2 | 1 | 0 | 0 | 3 | 0 | 2 | -11 | 0.9 |
| Club Náutico | Sergio Jiménez Galán | 11.033 | 0 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | -11 | 0.7 |
| CB Fresas | José Manuel Verges Gómez | 12.083 | 2 | 2 | 0 | 1 | 0 | 4 | 3 | -2 | -25 | -0.1 |
| CB Fresas | Francisco José Alvez Pardo | 18.917 | 1 | 2 | 1 | 0 | 0 | 3 | 0 | 2 | -20 | -0.6 |
| Club Náutico | Diego Valera Vilches | 6.333 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | -3 | -6 | -2.5 |

### Señales iniciales para calibración

Estas son hipótesis a contrastar con más jornadas, no decisiones de reglas:

1. Robos y tapones a `+3` pesan mucho: Campoy obtiene `10.7` raw con 3 puntos gracias a 2 robos y 1 tapón; Orta llega a `18.8` con solo 3 puntos gracias a 4 robos.
2. El rebote a `+1.2` produce un techo alto en interiores: Roca alcanza `31.1` pese a 7 pérdidas, impulsado por 18 rebotes.
3. El sistema premia perfiles multidimensionales frente a la valoración FAB: Macua obtiene `8.4` raw con valoración FAB `1`; Campoy, `10.7` con valoración `2`.
4. El resultado agregado raw queda casi empatado (`131.2`–`126.9`) aunque la valoración FAB difiere mucho (`94`–`62`). Conviene medir en una muestra mayor si esto es diversidad deseada o exceso de peso de robos/tapones.
5. Nunca deben calibrarse coeficientes usando filas `TOTALES`, y la muestra de normalización debe abarcar todas las actuaciones calculables de la jornada, no un único partido.

