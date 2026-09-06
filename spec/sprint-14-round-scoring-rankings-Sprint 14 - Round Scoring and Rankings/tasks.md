# sprint-14-round-scoring-rankings · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) Cada resultado de equipo usa exclusivamente los cinco titulares del snapshot de alineación `LOCKED` de esa liga y jornada; los dos suplentes nunca puntúan ni sustituyen automáticamente.  ↔ R1
- [ ] (T2) Un titular con score `DNP` o que no disputa el partido aporta exactamente 0; un score pendiente, no calculable o erróneo mantiene provisional el resultado de equipo y no se trata silenciosamente como cero.  ↔ R2
- [ ] (T3) El snapshot usado conserva los cinco jugadores, revisión de alineación, cutoff y versiones de scores y ruleset, de modo que el resultado es reproducible y auditable.  ↔ R3
- [ ] (T4) Una jornada solo se publica cuando todos sus partidos autoritativos han terminado y los scores necesarios de los titulares están en estado terminal calculable o DNP; aplazamientos mantienen la jornada provisional.  ↔ R4
- [ ] (T5) Ejecutar de nuevo el cálculo con el mismo conjunto de inputs y versión es idempotente: no crea duplicados, no cambia puntos ni altera posiciones.  ↔ R5
- [ ] (T6) Una corrección de boxscore o una nueva versión del ruleset crea una recomputación con revisión incremental, conserva el resultado anterior para auditoría y publica atómicamente la nueva revisión.  ↔ R6
- [ ] (T7) Los totales acumulados se derivan únicamente de la última revisión publicada de cada jornada y nunca cuentan dos revisiones de una misma jornada.  ↔ R7
- [ ] (T8) El ranking global incluye equipos fantasy elegibles de la `competitionSeason`; el ranking privado incluye solo membresías activas de la liga y ambos derivan de los mismos resultados base publicados.  ↔ R8
- [ ] (T9) Los equipos creados después de una jornada no reciben snapshot ni puntuación retroactiva para esa jornada y comienzan con cero acumulado hasta su primera jornada elegible.  ↔ R9
- [ ] (T10) El orden se determina por puntos acumulados descendentes, puntos de la última jornada computada descendentes, mejor puntuación individual de jornada descendente, fecha de creación del equipo ascendente e identificador estable ascendente.  ↔ R10
- [ ] (T11) La posición y su variación se calculan contra la jornada publicada anterior dentro del mismo ámbito; cuando no existe comparación, la variación es `null`.  ↔ R11
- [ ] (T12) La API `fantasy-round-ranking-api.v1` expone historial, detalle de jornada, total, posición, variación, revisión y desglose de los cinco titulares; usa enteros o decimales serializados de forma canónica, timestamps UTC y paginación determinista.  ↔ R12
- [ ] (T13) Los rankings privados requieren membresía activa y responden igual para liga inexistente y acceso no autorizado; la clasificación global no expone email ni otros datos privados.  ↔ R13
- [ ] (T14) El cálculo y la publicación son transaccionales y seguros frente a workers concurrentes; un fallo no deja mezcladas revisiones, totales o posiciones.  ↔ R14
- [ ] (T15) Un feature flag server-side impide nuevas recomputaciones con `FEATURE_DISABLED` y mantiene disponibles en solo lectura los resultados publicados.  ↔ R15
- [ ] (T16) La UI muestra puntos de jornada, acumulado, posición, variación y desglose de titulares, y cubre carga, vacío, provisional, recalculando, error y offline sin scroll horizontal desde 320 px.  ↔ R16
- [ ] (T17) Tests unitarios, de integración PostgreSQL y E2E verifican cinco titulares, suplentes excluidos, DNP a cero, pendientes, aplazamientos, idempotencia, recomputación, acumulados, permisos, concurrencia y todos los desempates.  ↔ R17
- [ ] Tests que cubran los criterios de aceptación
