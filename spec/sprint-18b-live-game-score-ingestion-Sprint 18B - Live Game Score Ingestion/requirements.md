# sprint-18b-live-game-score-ingestion · undefined — Requisitos

- name: `Sprint 18B - Live Game Score Ingestion` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-11T18:31:04.185Z

## Contexto



## Requisitos funcionales

R1. Si un partido está `Comenzado`/`live`, o su horario cae dentro de la ventana activa configurada, el ingestor puede consultar `/v2/envivo/estadisticas.ashx` mediante `FabClient` usando exclusivamente el `IdPartido` FAB persistido.
R2. El mapper lee del objeto `partido` al menos `estado_partido`, `tanteo_local`, `tanteo_visitante`, `periodos` y `fechaultimaactualizacion`; no exige que existan todavía filas de jugadores para actualizar el marcador.
R3. Un resultado `21-24` del endpoint en vivo sustituye los guiones o marcadores ausentes del endpoint general, pero una respuesta vacía, atrasada o menos completa nunca borra un tanteo o parcial válido ya persistido.
R4. La precedencia se decide por campo y frescura: el snapshot con actualización FAB válida más reciente gana; a igualdad o sin timestamp se conserva el valor más completo y no se infiere `0-0` de campos ausentes.
R5. Los parciales se persisten en orden de periodo y distinguen un periodo futuro todavía a cero de un dato ausente; prórrogas se admiten sin limitar el array a cuatro periodos.
R6. La transición de `scheduled` a `live` y después a `finished` es monotónica salvo una corrección FAB explícitamente más reciente; un payload general retrasado no reabre ni retrocede un partido finalizado.
R7. Actualizar el marcador en vivo no marca `stats_final`, no publica puntuación fantasy definitiva y no convierte estadísticas individuales ausentes en cero; los puntos fantasy live siguen el contrato provisional existente.
R8. Cada respuesta utilizada se conserva como RAW saneado con endpoint, partido externo, timestamp y checksum, sin `key`, `id_dispositivo`, tokens ni secretos; el Game conserva metadatos suficientes para conocer fuente y frescura del marcador efectivo.
R9. Repetir el mismo snapshot es idempotente: no duplica Game, RAW por checksum, revisiones ni derivados, y evita escrituras materiales cuando no cambia ningún campo efectivo.
R10. `sync-game-stats`, `sync-competition-stats`, `sync-all`, scheduler y jobs GAME/ROUND/COMPETITION reutilizan un único flujo de reconciliación y respetan advisory locks para no consultar ni escribir concurrentemente el mismo partido.
R11. La frecuencia activa es de 30 segundos por defecto y configurable entre 30 y 900 segundos, aplica rate limiting y backoff existentes y deja de sondear con cadencia live fuera de las ventanas de jornada; los fallos conservan el último marcador válido y generan un código de error seguro.
R12. La API y la PWA leen exclusivamente PostgreSQL y exponen estado, marcador nullable, parciales, última actualización y una indicación de frescura; nunca llaman a FAB desde el navegador.
R13. Tests sin red cubren el caso real observado `Estado=Comenzado` con resultado general `-/-` y endpoint live `21-24`, ausencia de jugadores, payload atrasado, corrección posterior, prórroga, respuesta parcial, error FAB e idempotencia.
R14. Un test de integración PostgreSQL demuestra que una secuencia scheduled → live 21-24 → live 38-41 → finished persiste transiciones y tanteos correctos sin duplicados ni regresiones.
R15. Cuando FAB publica filas individuales durante el encuentro, el ingestor actualiza `PlayerGameStat` como snapshot parcial con los campos realmente presentes; filas o campos ausentes no se borran ni se convierten en cero y un boxscore vacío sigue permitiendo actualizar el marcador.
R16. La validación estricta de suma de puntos, completitud de ambos equipos y eliminación de jugadores ausentes solo se aplica al cierre definitivo; durante el directo las incoherencias se conservan como provisionales y nunca se corrigen mediante divisiones o inferencias.
R17. Los fantasy scores derivados de estadísticas live se identifican como provisionales, pueden reemplazarse idempotentemente con cada snapshot y nunca publican el resultado de jornada, ranking o precio hasta disponer de estadísticas finales validadas.
R18. La experiencia de jornada distingue jugador sin datos live, jugador con estadísticas provisionales y jugador con dato final, mostrando frescura y evitando presentar una cifra parcial como definitiva.
R19. Tests cubren aparición tardía de jugadores, actualización acumulativa, desaparición temporal de una fila, campo individual ausente, incoherencia provisional entre puntos y marcador y sustitución final validada.
R20. Se documentan el contrato confirmado, la política de precedencia, la cadencia, los estados de degradación y el procedimiento de diagnóstico cuando buscador, marcador live y estadísticas individuales discrepan.
