# sprint-37-fantasy-preseason-registrations · Inscripciones de pretemporada y conciliación con boxscores — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) La fuente FAB de plantilla previa está documentada con fixtures saneados; un equipo sin fichas publicadas muestra PLANTILLA_NO_DISPONIBLE sin inventar jugadores.  ↔ R1
- [x] (T2) Una competición monitorizada se habilita para fantasy por ID FAB estable mediante acción INGESTION_ADMIN auditada; inicia una sincronización sin activar otras competiciones.  ↔ R2
- [x] (T3) Las inscripciones de una competición fantasy se actualizan al menos cada seis horas en pretemporada y con Sincronizar ahora usando el mismo pipeline, lock e idempotencia.  ↔ R3
- [x] (T4) Los jugadores publicados antes del primer partido son seleccionables con su equipo y precio inicial sin depender de PlayerGameStat.  ↔ R4
- [x] (T5) Plantilla y boxscore conservan el mismo Player, PlayerRegistration y referencias fantasy con ID común verificado o fallback único y tentativo por nombre y apellidos normalizados, equipo, competición y temporada; los conflictos se alertan sin fusionar.  ↔ R5
- [x] (T6) Un jugador visto primero en una boxscore aparece como inscripción provisional y se concilia después por ID verificado o fallback único tentativo sin duplicarse ni borrar referencias; una identidad ambigua queda pendiente de revisión.  ↔ R6
- [x] (T7) Fallos, respuestas parciales o vacíos no autoritativos conservan el último snapshot válido y no convierten ausencia de datos en cero legítimo.  ↔ R7
- [x] (T8) La consola distingue cobertura de equipos, inscripciones y estadísticas, muestra progreso y errores seguros, y no expone secretos ni RAW.  ↔ R8
- [x] (T9) Tests sin red e integración cubren dos dispositivos, ambos órdenes de llegada, homónimos, cambios de equipo, idempotencia, locks y rollback; pasan los gates del repositorio.  ↔ R9
- [x] Tests que cubran los criterios de aceptación
