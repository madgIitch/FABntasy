# sprint-29-monitored-competition-team-index · Índice de equipos y jugadores en competiciones monitorizadas — Requisitos

- name: `Sprint 29 - Monitored Competition Team Index` · priority: P1 · sdd: true
- aprobado por: peorr · 2026-09-16T15:45:35.690Z

## Contexto

Extender las tarjetas de competiciones monitorizadas de Administrar ingesta con un índice consultable de sus equipos y el número de jugadores inscritos en cada uno, acompañado de totales, frescura y estados que distingan datos completos, parciales, todavía no sincronizados y fallidos.

## Requisitos funcionales

R1. Cada tarjeta de competición monitorizada muestra el total de equipos y el total de inscripciones de jugadores pertenecientes a su CompetitionSeason; el total de jugadores es la suma de las inscripciones incluidas en los equipos del índice y se etiqueta como inscripciones, no como personas únicas globales.
R2. Un control de expansión con estado accesible permite abrir y cerrar el índice dentro de cada tarjeta; al abrirlo se muestran todos los equipos de esa competición en orden alfabético por nombre normalizado y, como desempate, por ID interno estable, junto con el número de inscripciones de jugadores de cada equipo.
R3. La identidad de equipos y jugadores se resuelve por sus IDs y relaciones normalizadas; equipos con el mismo nombre permanecen en filas distintas y una misma persona inscrita en equipos o temporadas diferentes se cuenta una vez por cada PlayerRegistration incluida.
R4. Los conteos se calculan exclusivamente desde TeamRegistration y PlayerRegistration del snapshot normalizado vigente de la CompetitionSeason monitorizada; no incluyen otras temporadas, competiciones o equipos sin inscripción en esa temporada.
R5. La respuesta administrativa incluye por competición coverageStatus, calculatedAt, teamsLastSyncedAt y playersLastSyncedAt, además de teamCount, playerRegistrationCount y las filas teamId, teamName y playerRegistrationCount; timestamps son ISO 8601 UTC y los conteos son enteros no negativos o null cuando el dato no puede afirmarse.
R6. coverageStatus distingue COMPLETE, PARTIAL, NOT_SYNCED, STALE y FAILED: NOT_SYNCED y FAILED no presentan null como cero; PARTIAL y STALE muestran el último snapshot válido con una advertencia visible y FAILED conserva los últimos datos válidos si existen.
R7. Una competición sincronizada correctamente sin equipos muestra un estado vacío explícito y totales cero; este caso solo se considera vacío legítimo cuando coverageStatus es COMPLETE, nunca por una respuesta FAB parcial, fallida o todavía no sincronizada.
R8. Consultar o expandir el índice es una operación de solo lectura sobre PostgreSQL, no solicita trabajos, no llama a FAB y no modifica el catálogo; la resincronización continúa usando la acción auditada existente del Sprint 22C.
R9. La ruta y la API mantienen la protección INGESTION_ADMIN y el comportamiento 404 para usuarios no autorizados; la respuesta no expone credenciales, cabeceras, cookies, payloads RAW, errores internos ni datos personales de jugadores.
R10. El índice tiene estados de carga, error y reintento accesibles, conserva el control que lo abrió, usa nombres y relaciones semánticas comprensibles para lector de pantalla y no introduce scroll horizontal involuntario a 320, 375, 768, 1024 o 1440 px.
R11. La consulta evita N+1 y devuelve el resumen de todas las competiciones monitorizadas de la vista con agregación acotada; los tests verifican que el número de consultas no crece linealmente con el número de equipos y que una competición no recibe conteos de otra.
R12. Los tests unitarios, de integración PostgreSQL y de interfaz cubren cero equipos completo, no sincronizado, snapshot parcial, snapshot fallido con y sin datos previos, equipos homónimos, inscripciones en varias temporadas, orden estable, autorización, expansión por teclado y responsive; typecheck, lint, test y diff-scope terminan con código cero.
R13. El cambio de datos, si resulta necesario, es aditivo y compatible con las filas existentes; desactivar la interfaz restaura las tarjetas de Sprint 22C sin borrar equipos, inscripciones ni historial de ingesta.

## Restricciones

- **error_states:** COMPLETE, PARTIAL, NOT_SYNCED, STALE y FAILED distinguen cero legítimo, ausencia de datos y último snapshot válido.
- **auth_secrets:** La lectura exige INGESTION_ADMIN, conserva el 404 y excluye RAW, secretos, errores internos y datos personales.
- **rollback_compat:** Cualquier cambio persistente es aditivo y la UI puede desactivarse sin borrar datos ni alterar las tarjetas previas.

