# sprint-38-disable-fantasy-competition · Deshabilitar una competición para Fantasy — Requisitos

- name: `Sprint 38 - Disable Fantasy Competition` · priority: P0 · sdd: true
- aprobado por: peorr · 2026-09-24T16:00:32.950Z

## Contexto

Retirar de Fantasy una competición habilitada, sus equipos, jugadores y ligas privadas, conservando los datos deportivos y Fantasy para una reactivación segura.

## Requisitos funcionales

R1. INGESTION_ADMIN puede deshabilitar y reactivar una competición con auditoría e idempotencia, sin cambiar monitored ni borrar datos.
R2. Equipos, jugadores y ligas privadas de la edición deshabilitada desaparecen de las superficies Fantasy y las URLs directas muestran un estado suspendido; otras ediciones no se afectan.
R3. Las mutaciones de ligas, mercado y plantillas rechazan IDs de una edición deshabilitada aun con una sesión antigua.
R4. La ingesta deportiva monitorizada continúa, pero las fases de plantillas y puntuación Fantasy se detienen hasta reactivar.
R5. Reactivar conserva UUID, ligas privadas, plantillas, saldos e historial y solicita una nueva sincronización.
R6. Tests cubren competición primaria, ligas existentes, concurrencia y reactivación; pasan los gates.

## Restricciones

- **error_states:** La edición suspendida ofrece estado explícito en lecturas y rechazos seguros en mutaciones.
- **auth_secrets:** La acción exige INGESTION_ADMIN, verificación de origen y auditoría; no expone secretos FAB.
- **rollback_compat:** La desactivación es reversible y preserva UUID, ligas, plantillas, saldos e historial.

