# sprint-9-fantasy-scoring-engine · undefined — Requisitos

- name: `Sprint 9 - Fantasy Scoring Engine` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-05T18:02:25.476Z

## Contexto



## Requisitos funcionales

R1. AC1: Existe un ruleset inicial aprobado con identificador y versión inmutables, fórmula completa, pesos, bonus, política de null/DNP, negativos y redondeo, acompañado de ejemplos numéricos oficiales.
R2. AC2: El cálculo es una función pura sobre un snapshot canónico de boxscore y un ruleset inmutable; repetirlo produce exactamente el mismo score y breakdown serializado.
R3. AC3: Cada resultado persiste player_game_stat, ruleset_version, identificador inmutable de source_stats_version, score, estado, breakdown por término y timestamps; una constraint impide duplicar la misma combinación de inputs.
R4. AC4: Cada elemento del breakdown conserva regla aplicada, valor estadístico original incluido null, coeficiente o condición, contribución sin redondear y contribución final; la suma según la política aprobada coincide exactamente con el score.
R5. AC5: Si un campo requerido es null, el motor aplica la política explícita del ruleset y nunca lo convierte implícitamente en cero; cuando el cálculo no sea posible se persiste o devuelve un estado no calculable con código estable y sin score engañoso.
R6. AC6: Publicar o recalcular con una nueva ruleset_version crea resultados separados y no actualiza ni elimina los de versiones anteriores; la versión consultada o activa siempre es explícita.
R7. AC7: Una recomputación se ejecuta transaccionalmente e idempotentemente: un fallo no deja resultados parciales y dos ejecuciones concurrentes para los mismos inputs convergen en una sola fila.
R8. AC8: La API server-side devuelve score, estado, ruleset_version, source_stats_version y breakdown sin exponer RAW ni credenciales; su esquema y compatibilidad quedan documentados.
R9. AC9: La UI muestra la fórmula aplicada por conceptos y distingue mediante texto los estados calculado, datos desconocidos, pendiente/error y recalculado; permite identificar qué versión se está viendo y funciona desde 320 px sin scroll horizontal involuntario.
R10. AC10: Desactivar o retirar una versión no borra sus resultados; se puede volver a seleccionar la versión activa anterior mediante una operación documentada y auditable.
R11. AC11: Tests unitarios usan casos dorados con resultados exactos para cero, máximos/extremos, null requerido y opcional, DNP, bonus coincidentes, score negativo y fronteras de redondeo; tests PostgreSQL verifican constraints, histórico, rollback transaccional, idempotencia y concurrencia.
R12. AC12: Todos los tests se ejecutan sin red FAB y los gates vigentes de TypeScript, lint, tests y Prisma terminan con código 0.

## Restricciones

- **error_states:** Un null en cualquier campo requerido por el ruleset produce NOT_CALCULABLE/MISSING_REQUIRED_STAT, se persiste sin scores y nunca se interpreta como cero; los campos no usados pueden ser null. Una muestra menor de 20 actuaciones elegibles no-DNP o una desviación estándar poblacional igual a cero produce PENDING/INSUFFICIENT_NORMALIZATION_SAMPLE y normalized_score null. La ausencia de ruleset activo conserva su código estable. El procesamiento por lote es transaccional: un fallo no publica resultados parciales, y un ruleset inválido no puede publicarse ni activarse.
- **auth_secrets:** El motor se ejecuta exclusivamente en servidor sobre estadísticas persistidas, no necesita credenciales FAB nuevas y no expone credenciales ni RawFabPayload en API, breakdown, errores o logs.
- **rollback_compat:** Los rulesets publicados son inmutables y solo puede existir uno activo por competitionSeason y tipo de cálculo. La activación y reactivación son transaccionales y auditables. Retirar una versión la marca RETIRED sin borrar reglas ni resultados. Las correcciones de datos y los cambios de versión generan resultados separados por source_stats_version y ruleset, preservando el histórico.

