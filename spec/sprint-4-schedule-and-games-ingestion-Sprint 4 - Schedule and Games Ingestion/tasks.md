# sprint-4-schedule-and-games-ingestion · Sprint 4 - Schedule and Games Ingestion — Tareas

Checklist de implementación. Todos los criterios están verificados.

- [x] (T1) Sync por IDs persistidos mediante `Jornadas` y `horariosJornadas`, sin `buscarPartido`. ↔ R1
- [x] (T2) Contratos de APK validados contra Copa Delegación y fixtures anonimizadas. ↔ R2
- [x] (T3) Normalización completa e idempotente de partido, horario, jornada, estado, resultados y `TipoActa`. ↔ R3
- [x] (T4) Reprogramaciones y resultados actualizan el mismo Game por ID FAB. ↔ R4
- [x] (T5) Ausencias marcadas `stale` solo después de un recorrido completo. ↔ R5
- [x] (T6) RAW saneado y rollback ante referencias o contratos incompatibles. ↔ R6
- [x] (T7) Dos ejecuciones reales confirman idempotencia: 9 altas y después 9 actualizaciones. ↔ R7
- [x] (T8) Tests unitarios y PostgreSQL cubren identidad, reprogramación, duplicados, descansos, stale y fallo parcial. ↔ R8
- [x] Tests que cubren los criterios de aceptación.
