# FABntasy — Puntuación y mercado de jugadores

## 1. Diferencias de datos entre competiciones

La principal limitación es que **no todas las ligas ofrecen el mismo nivel de estadísticas**.

### 1ª Provincial

Disponemos principalmente de:

- Puntos.
- Faltas.
- Tiros libres.
- Triples.
- Canastas de 2.

### Nacional Andaluza

Además de las anteriores, se registran estadísticas más completas, como:

- Rebotes.
- TLC y otras estadísticas adicionales.
- Potencialmente más datos propios de un box score completo.

Esto provoca un problema: **si se usa una fórmula fantasy idéntica para todas las ligas, los jugadores de Nacional tendrían ventaja simplemente porque se registran más estadísticas sobre ellos**.

---

## 2. Jugadores de distintas ligas en el mismo mercado

El objetivo es que un usuario pueda fichar indistintamente jugadores de:

- 1ª Provincial.
- Nacional Andaluza.

Por tanto, los puntos fantasy deben ser **comparables entre competiciones**, aunque internamente se calculen con estadísticas diferentes.

### Principio general

> Las estadísticas sirven para medir el rendimiento dentro de cada liga; los puntos FABntasy sirven para comparar jugadores entre ligas.

---

## 3. Sistema de puntuación

Cada competición puede tener una fórmula interna adaptada a los datos disponibles.

### Provincial

Ejemplo conceptual:

```text
RawProv = función(
    puntos,
    tiros de 2,
    triples,
    tiros libres,
    faltas
)
```

### Nacional

Ejemplo conceptual:

```text
RawNac = función(
    puntos,
    tiros,
    faltas,
    rebotes,
    asistencias,
    recuperaciones,
    pérdidas,
    tapones,
    ...
)
```

Después, ambas puntuaciones brutas se **normalizan dentro de su propia competición**.

---

## 4. Normalización entre ligas

En lugar de comparar directamente los puntos brutos, se mide cómo de buena ha sido la actuación respecto al resto de jugadores de esa competición.

Ejemplo:

- Jugador Provincial: rendimiento en el percentil 90.
- Jugador Nacional: rendimiento en el percentil 85.

Ambos percentiles se convierten después a una escala FABntasy común.

Ejemplo de escala:

| FP | Interpretación |
|---:|---|
| 10 | Partido malo |
| 20 | Partido medio |
| 30 | Buen partido |
| 40 | Partidazo |
| 50 | Actuación excepcional |

Una fórmula conceptual podría ser:

```text
FantasyScore = 20 + 10 × Z
```

con límites:

```text
0 <= FantasyScore <= 50
```

También puede combinarse:

```text
50% rendimiento absoluto
+
50% rendimiento relativo a la competición
```

para evitar que una actuación mediocre parezca extraordinaria únicamente por pertenecer a un grupo pequeño.

---

# 5. Precio de mercado

El precio de un jugador debe estar relacionado con su rendimiento fantasy, pero **no debe cambiar de forma descontrolada por un solo partido**.

La idea general es:

```text
rendimiento → precio objetivo → ajuste progresivo del precio actual
```

---

## 6. Precio inicial

Inicialmente se planteó usar rendimiento histórico, pero existe una limitación importante:

> Gesdeportiva elimina de la app los datos de los jugadores de una temporada a otra.

Por tanto, al comenzar FABntasy **no podemos asumir que exista histórico accesible**.

### Solución: cold start

La primera temporada debe comenzar prácticamente desde cero.

Una opción sencilla:

```text
Precio inicial de todos los jugadores = 3,0 M€
```

Esto evita introducir sesgos arbitrarios entre Provincial y Nacional.

También convierte las primeras jornadas en una fase de descubrimiento del mercado.

---

## 7. Descubrimiento progresivo del valor

Tras cada jornada, FABntasy calcula un valor esperado del jugador según los partidos que ya haya disputado.

Ejemplo:

### 1 partido

```text
Rating = 100% último partido
```

### 3 partidos

```text
Rating =
50% último
+ 30% penúltimo
+ 20% anterior
```

### Temporada avanzada

```text
Rating =
50% últimos 5 partidos
+ 50% media de temporada
```

De esta manera, el sistema se adapta aunque no exista histórico previo.

---

## 8. Precio objetivo

La media/rating fantasy se transforma en un precio objetivo.

Conceptualmente:

```text
PrecioObjetivo = función(Rating)
```

Después el jugador no salta directamente a ese valor, sino que el precio converge poco a poco.

```text
PrecioNuevo =
PrecioActual
+ α × (PrecioObjetivo - PrecioActual)
```

---

## 9. Volatilidad según el histórico disponible

`α` debe ser mayor al principio de temporada y menor cuando ya conocemos bien al jugador.

Ejemplo:

| Partidos registrados | α |
|---:|---:|
| 1 | 0,50 |
| 2-3 | 0,35 |
| 4-6 | 0,25 |
| 7+ | 0,15 |

Esto significa que:

- Los jugadores nuevos encuentran rápido su precio real.
- Los jugadores consolidados no se desploman por un solo mal partido.

También puede aplicarse un límite de variación por jornada, por ejemplo:

```text
máximo +15%
máximo -15%
```

---

## 10. Rentabilidad del jugador

La gracia del mercado no debe ser simplemente fichar a quienes más puntos hacen, sino detectar jugadores infravalorados.

Puede mostrarse una métrica como:

```text
Rentabilidad = FP medios / Precio en M€
```

Ejemplo:

| Jugador | Precio | FP/J | FP por M€ |
|---|---:|---:|---:|
| A | 9 M€ | 31 | 3,4 |
| B | 3 M€ | 20 | 6,7 |
| C | 5 M€ | 23 | 4,6 |

Aunque A sea mejor jugador, B puede ser mejor fichaje.

---

## 11. Oferta y demanda de usuarios

Inicialmente **no conviene modificar el precio según cuántos usuarios compren a un jugador**.

Con pocos usuarios sería fácil manipular el mercado.

Primera versión:

```text
precio = rendimiento deportivo
```

La popularidad puede mostrarse aparte:

```text
🔥 +347 fichajes esta jornada
```

En el futuro, si FABntasy alcanza suficiente volumen de usuarios, la oferta/demanda podría influir ligeramente en el precio.

---

## 12. Histórico propio de FABntasy

Aunque Gesdeportiva borre los datos entre temporadas, FABntasy debe guardar sus propios datos desde el primer día.

Por cada partido/jornada:

```text
player_id
season
jornada
stats
fantasy_points
market_value
```

De esta manera:

- La primera temporada será el único verdadero cold start.
- A partir de la segunda temporada, FABntasy tendrá histórico propio.

### Identidad de jugadores

No conviene depender únicamente del identificador de Gesdeportiva, porque puede cambiar de una temporada a otra.

FABntasy debería disponer de su propio `player_id` y tratar de identificar jugadores entre temporadas mediante los datos disponibles:

- Nombre.
- Equipo.
- Dorsal.
- Otros datos disponibles.

Si el emparejamiento no es fiable, se trata al jugador como nuevo.

---

# 13. Filosofía general del sistema

FABntasy debe asumir que las fuentes de datos son heterogéneas.

Por tanto:

1. Cada liga calcula el rendimiento usando las estadísticas disponibles.
2. El rendimiento se normaliza para obtener una puntuación FABntasy común.
3. Los jugadores de Provincial y Nacional pueden competir dentro del mismo mercado.
4. El precio depende de los FP normalizados.
5. La primera temporada comienza sin histórico.
6. Los precios convergen rápidamente durante las primeras jornadas.
7. FABntasy conserva su propio histórico para temporadas futuras.

La idea central es:

> **No queremos saber cuánto vale objetivamente un jugador desde el primer día. Queremos que FABntasy vaya descubriendo su valor conforme avanza la temporada.**
