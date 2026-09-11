# Ingesta de partidos en directo

## Contrato observado

En Copa Delegación 2026 se confirmó que `buscarPartido` puede devolver `Estado=Comenzado` y marcador `-/-` mientras `/v2/envivo/estadisticas.ashx` ya publica `tanteo_local`, `tanteo_visitante`, `periodos` y `fechaultimaactualizacion`. El mismo endpoint puede devolver temporalmente cero filas de jugadores aunque el marcador avance.

## Reconciliación

- El calendario sigue siendo la fuente de equipos, jornada y horario.
- El endpoint live tiene precedencia para estado, marcador y parciales cuando su timestamp no es anterior al snapshot live persistido.
- Valores ausentes nunca borran valores válidos y un partido finalizado no retrocede.
- `score_source=live_stats` y `live_score_updated_at` identifican procedencia y frescura.
- Los periodos se conservan como lista abierta para admitir prórrogas.

## Estadísticas individuales

Si FAB publica jugadores durante el partido, se actualizan las filas presentes como `partial`. Los campos ausentes permanecen sin modificar y una desaparición temporal no elimina al jugador. En directo no se exige que ambos equipos estén completos ni que la suma de puntos coincida con el marcador.

Al finalizar se recupera el contrato estricto: ambos equipos deben tener filas, la suma de puntos debe coincidir con el tanteo y solo entonces se eliminan ausencias, se marca `stats_final` y la jornada puede publicarse. No se dividen ni corrigen cifras incoherentes por inferencia.

Las jornadas con estadísticas parciales pueden recalcular scores y resultados provisionales. Precios y publicación definitiva continúan bloqueados hasta que toda la cohorte esté finalizada y validada.

## Cadencia y degradación

El scheduler usa `FAB_SCHEDULER_ACTIVE_SECONDS` (30 segundos por defecto, configurable entre 30 y 900) dentro de las ventanas de jornada. Fuera de ellas conserva `FAB_SCHEDULER_IDLE_MINUTES`. Son elegibles los partidos `live` y los programados entre seis horas antes y una hora después del instante actual, para tolerar retrasos de estado. El rate limiting, backoff y circuit breaker siguen activos; un fallo de FAB conserva el último snapshot válido y el navegador nunca consulta FAB directamente.

## Diagnóstico

1. Comparar `source_status`, `score_source`, `live_score_updated_at` y `stats_sync_status` en `games`.
2. Revisar el RAW saneado de `/v2/envivo/estadisticas.ashx` por `external_id` y checksum.
3. Si hay marcador pero no jugadores, el estado esperado es marcador live con estadísticas `pending`.
4. Si aparecen jugadores, el estado esperado es `partial`; si el partido termina con un boxscore incoherente, permanece reintentable y no se publica.
