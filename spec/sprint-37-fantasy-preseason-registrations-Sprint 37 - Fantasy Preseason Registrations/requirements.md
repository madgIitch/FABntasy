# sprint-37-fantasy-preseason-registrations · Inscripciones de pretemporada y conciliación con boxscores — Requisitos

- name: `Sprint 37 - Fantasy Preseason Registrations` · priority: P0 · sdd: true
- aprobado por: peorr · 2026-09-24T11:40:38.532Z

## Contexto

Obtener jugadores de competiciones habilitadas para fantasy antes del primer partido, sincronizarlos periódicamente o a petición y conciliar sus inscripciones con las boxscores sin duplicar identidades.

## Requisitos funcionales

R1. La fuente FAB de plantilla previa está validada con fixtures saneados e IDs contrastados entre dos dispositivos y boxscores; si no existe, no se inventan jugadores y se muestra PLANTILLA_NO_DISPONIBLE.
R2. Una competición monitorizada se habilita para fantasy por ID FAB estable mediante acción INGESTION_ADMIN auditada; inicia una sincronización sin activar otras competiciones.
R3. Las inscripciones de una competición fantasy se actualizan al menos cada seis horas en pretemporada y con Sincronizar ahora usando el mismo pipeline, lock e idempotencia.
R4. Los jugadores publicados antes del primer partido son seleccionables con su equipo y precio inicial sin depender de PlayerGameStat.
R5. Plantilla y boxscore con identidad FAB verificada conservan el mismo Player, PlayerRegistration y referencias fantasy; nombre y dorsal no son claves.
R6. Un jugador visto primero en una boxscore aparece como inscripción provisional y se concilia después sin duplicarse ni borrar referencias; una identidad ambigua queda pendiente de revisión.
R7. Fallos, respuestas parciales o vacíos no autoritativos conservan el último snapshot válido y no convierten ausencia de datos en cero legítimo.
R8. La consola distingue cobertura de equipos, inscripciones y estadísticas, muestra progreso y errores seguros, y no expone secretos ni RAW.
R9. Tests sin red e integración cubren dos dispositivos, ambos órdenes de llegada, homónimos, cambios de equipo, idempotencia, locks y rollback; pasan los gates del repositorio.

## Restricciones

- **error_states:** Se distinguen ausencia de fuente, plantilla pendiente, fallo, parcial y vacío autoritativo sin borrar snapshots.
- **auth_secrets:** Solo INGESTION_ADMIN activa y solicita jobs; FAB se consulta en servidor y RAW se sanea.
- **rollback_compat:** Migraciones aditivas y preservación de registros y referencias fantasy existentes.
