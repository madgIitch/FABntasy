# sprint-38-disable-fantasy-competition · Deshabilitar una competición para Fantasy — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) INGESTION_ADMIN puede deshabilitar y reactivar una competición con auditoría e idempotencia, sin cambiar monitored ni borrar datos.  ↔ R1
- [ ] (T2) Equipos, jugadores y ligas privadas de la edición deshabilitada desaparecen de las superficies Fantasy y las URLs directas muestran un estado suspendido; otras ediciones no se afectan.  ↔ R2
- [ ] (T3) Las mutaciones de ligas, mercado y plantillas rechazan IDs de una edición deshabilitada aun con una sesión antigua.  ↔ R3
- [ ] (T4) La ingesta deportiva monitorizada continúa, pero las fases de plantillas y puntuación Fantasy se detienen hasta reactivar.  ↔ R4
- [ ] (T5) Reactivar conserva UUID, ligas privadas, plantillas, saldos e historial y solicita una nueva sincronización.  ↔ R5
- [ ] (T6) Tests cubren competición primaria, ligas existentes, concurrencia y reactivación; pasan los gates.  ↔ R6
- [ ] Tests que cubran los criterios de aceptación
