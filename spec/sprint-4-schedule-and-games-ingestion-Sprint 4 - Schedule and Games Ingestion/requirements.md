# sprint-4-schedule-and-games-ingestion · undefined — Requisitos

- name: `Sprint 4 - Schedule and Games Ingestion` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-04T23:01:42.674Z

## Contexto



## Requisitos funcionales

R1. AC1: `sync-competition-games --category-id 10468` recorre exclusivamente los IDs persistidos de categoría, fase, grupo/ronda y jornada mediante `Jornadas` y `horariosJornadas`; no usa `buscarPartido` ni nombres para descubrir partidos.
R2. AC2: Los contratos POST form-urlencoded de `Jornadas` y `horariosJornadas` coinciden con la APK, se validan contra Copa Delegación real y quedan representados por fixtures anonimizadas sin credenciales.
R3. AC3: Cada partido se identifica por su ID FAB y se persiste idempotentemente con local, visitante, fecha/hora en `Europe/Madrid`, jornada, fase/grupo/ronda, estado, resultado, parciales disponibles y `TipoActa` original; `has_statistics` se deriva únicamente del valor externo confirmado.
R4. AC4: Un cambio de horario, estado o resultado actualiza el mismo Game y conserva `source_updated_at` y `last_seen_at`; repetir un payload no duplica Game, equipos ni external IDs.
R5. AC5: Solo tras completar todo el recorrido sin errores, los partidos previamente conocidos que no aparezcan se marcan `stale`; nunca se borran automáticamente y un recorrido parcial o fallido no altera su presencia.
R6. AC6: Respuestas FAB usadas por el sync se guardan en RawFabPayload con checksum y sin `key`, `id_dispositivo`, token, password ni secret; una referencia a equipo desconocido o una forma incompatible produce un error contractual y rollback de datos normalizados.
R7. AC7: La ejecución real sobre Copa Delegación produce un resumen reproducible de grupos, jornadas, partidos nuevos, actualizados y stale, y una segunda ejecución confirma la idempotencia.
R8. AC8: Tests sin red cubren altas, actualizaciones, reprogramaciones, resultados, duplicados, `DESCANSA`, desaparición temporal y fallo parcial; integración PostgreSQL verifica identidad estable y rollback.

## Restricciones

- **error_states:** Un grupo o jornada incompatible guarda RAW saneado, aborta la transacción de normalización y no marca como stale lo no recorrido; solo un recorrido completo puede cambiar presencia.
- **auth_secrets:** Todas las llamadas pasan por FabClient/FileCredentialStore y RawFabPayload elimina credenciales; CLI solo informa conteos e IDs deportivos.
- **rollback_compat:** Cada sincronización normalizada es transaccional; no borra Game ni RAW histórico. La migración aditiva de estado de sincronización tiene rollback de desarrollo.

