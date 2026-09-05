# sprint-9-fantasy-scoring-engine · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) AC1: Existe un ruleset inicial aprobado con identificador y versión inmutables, fórmula completa, pesos, bonus, política de null/DNP, negativos y redondeo, acompañado de ejemplos numéricos oficiales.  ↔ R1
- [x] (T2) AC2: El cálculo es una función pura sobre un snapshot canónico de boxscore y un ruleset inmutable; repetirlo produce exactamente el mismo score y breakdown serializado.  ↔ R2
- [x] (T3) AC3: Cada resultado persiste player_game_stat, ruleset_version, identificador inmutable de source_stats_version, score, estado, breakdown por término y timestamps; una constraint impide duplicar la misma combinación de inputs.  ↔ R3
- [x] (T4) AC4: Cada elemento del breakdown conserva regla aplicada, valor estadístico original incluido null, coeficiente o condición, contribución sin redondear y contribución final; la suma según la política aprobada coincide exactamente con el score.  ↔ R4
- [x] (T5) AC5: Si un campo requerido es null, el motor aplica la política explícita del ruleset y nunca lo convierte implícitamente en cero; cuando el cálculo no sea posible se persiste o devuelve un estado no calculable con código estable y sin score engañoso.  ↔ R5
- [x] (T6) AC6: Publicar o recalcular con una nueva ruleset_version crea resultados separados y no actualiza ni elimina los de versiones anteriores; la versión consultada o activa siempre es explícita.  ↔ R6
- [x] (T7) AC7: Una recomputación se ejecuta transaccionalmente e idempotentemente: un fallo no deja resultados parciales y dos ejecuciones concurrentes para los mismos inputs convergen en una sola fila.  ↔ R7
- [x] (T8) AC8: La API server-side devuelve score, estado, ruleset_version, source_stats_version y breakdown sin exponer RAW ni credenciales; su esquema y compatibilidad quedan documentados.  ↔ R8
- [x] (T9) AC9: La UI muestra la fórmula aplicada por conceptos y distingue mediante texto los estados calculado, datos desconocidos, pendiente/error y recalculado; permite identificar qué versión se está viendo y funciona desde 320 px sin scroll horizontal involuntario.  ↔ R9
- [x] (T10) AC10: Desactivar o retirar una versión no borra sus resultados; se puede volver a seleccionar la versión activa anterior mediante una operación documentada y auditable.  ↔ R10
- [x] (T11) AC11: Tests unitarios usan casos dorados con resultados exactos para cero, máximos/extremos, null requerido y opcional, DNP, bonus coincidentes, score negativo y fronteras de redondeo; tests PostgreSQL verifican constraints, histórico, rollback transaccional, idempotencia y concurrencia.  ↔ R11
- [x] (T12) AC12: Todos los tests se ejecutan sin red FAB y los gates vigentes de TypeScript, lint, tests y Prisma terminan con código 0.  ↔ R12
- [x] Tests que cubran los criterios de aceptación
