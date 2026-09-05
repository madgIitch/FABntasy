# sprint-5-boxscore-ingestion · undefined — Requisitos

- name: `Sprint 5 - Boxscore Ingestion` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-05T03:20:00.165Z

## Contexto



## Requisitos funcionales

R1. AC1: `FabClient.get_match_stats(id_partido)` usa exclusivamente POST form-urlencoded `/v2/envivo/estadisticas.ashx` con credenciales server-side e `id_partido`, valida `resultado`, `estadisticas` y `partido`, y nunca expone credenciales.
R2. AC2: El contrato se valida con al menos un partido FAB terminado cuyo `TipoActa` sea `ESTADÍSTICAS`; la respuesta se conserva saneada y se convierte en fixture anonimizada antes de cerrar el mapper.
R3. AC3: Cada fila PlayerGameStat referencia Game y PlayerRegistration del equipo correcto; IDs FAB estables se reutilizan y, si faltan, la identidad provisional incluye partido/equipo sin fusionar por nombre globalmente.
R4. AC4: Se conservan como nullable puntos, minutos, titularidad, tiros, rebotes, asistencias, robos/recuperaciones, pérdidas, tapones, faltas, valoración y más/menos; un campo ausente nunca se transforma en cero.
R5. AC5: Reingerir el mismo boxscore actualiza las mismas filas y mantiene todos los payloads RAW por checksum; una corrección posterior de FAB reemplaza valores normalizados de forma auditable.
R6. AC6: Solo un boxscore estructuralmente completo y coherente marca el Game como `stats_final`; respuestas incompletas, equipos desconocidos o jugadores contradictorios hacen rollback y dejan el partido reintentable.
R7. AC7: El CLI permite sincronizar un partido explícito y todos los partidos terminados elegibles de una CompetitionSeason, mostrando únicamente conteos de partidos/jugadores creados, actualizados o rechazados.
R8. AC8: Tests sin red cubren contrato, mapping completo, nullability, identidad, correcciones, duplicados e inconsistencias; integración PostgreSQL verifica idempotencia y rollback.

## Restricciones

- **error_states:** Una respuesta vacía, incompleta o contradictoria conserva RAW pero no publica estadísticas finales; el partido queda reintentable.
- **auth_secrets:** El endpoint solo se consume desde FabClient con credenciales server-side; RAW y logs se sanean.
- **rollback_compat:** La escritura de jugadores, inscripciones, estadísticas y estado del partido es transaccional; migraciones únicamente aditivas.
