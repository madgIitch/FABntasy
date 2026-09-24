# Sprint 38 — Deshabilitar una competición para Fantasy

Estado: propuesta preparada para aprobación (`spec_approved: false`). No autoriza implementación todavía.

## Objetivo

Un administrador de ingesta puede retirar una competición de Fantasy de forma inmediata y reversible. Sus equipos y jugadores dejan de aparecer y de poder utilizarse en Fantasy. La competición puede seguir monitorizada en FAB y sus datos deportivos se conservan para auditoría y una posible reactivación.

## Comportamiento aprobado propuesto

1. En `/app/admin/ingestion`, una competición habilitada muestra «Deshabilitar fantasy». La acción exige `INGESTION_ADMIN`, comprobación de origen, confirmación explícita de la competición afectada y auditoría. Repetir la acción es idempotente.
2. La desactivación cambia en una sola transacción `fantasy_enabled=false` y `fantasy_role=disabled`. No cambia `monitored`, no borra `TeamRegistration`, `PlayerRegistration`, partidos, estadísticas, ligas privadas, plantillas, transacciones ni puntuaciones históricas. Si era la primaria, una competición que permanezca habilitada asume `primary` de forma determinista; si no hay ninguna, no se designa primaria.
3. Las listas y selectores públicos de competiciones, equipos y jugadores solo incluyen ediciones habilitadas. Las ligas privadas ya creadas sobre una edición deshabilitada quedan suspendidas: desaparecen de la selección activa y sus URLs directas muestran un estado claro de «competición no disponible». Se conservan intactas para volver a estar disponibles al reactivar la edición.
4. Las operaciones de creación/unión de ligas, mercado, plantillas, cláusulas, puntuación y cualquier mutación que reciba un ID antiguo comprueban en el servidor `fantasy_enabled=true` dentro de su operación o transacción. Una sesión o petición abierta antes de la desactivación no puede crear una operación nueva después. El error usa un código seguro y consistente. La desactivación no afecta a ligas de otras competiciones.
5. Si la competición continúa monitorizada, el ingestor sigue actualizando catálogo, equipos, calendario y boxscores para fines deportivos. Se detiene la fase profunda de plantillas y el ciclo de puntuación Fantasy mientras permanezca deshabilitada. Los jobs ya en curso pueden finalizar su lectura FAB, pero ninguna escritura Fantasy posterior debe ignorar el estado deshabilitado.
6. «Habilitar fantasy» vuelve a activar la misma `CompetitionSeason` y solicita una nueva sincronización de plantillas. Los UUID, ligas privadas, equipos Fantasy y saldos anteriores se mantienen; ningún dato histórico se duplica ni se restablece de forma implícita.

## Estados y casos límite

- Si una edición tiene ligas privadas activas, el panel indica cuántas quedarán suspendidas antes de confirmar. En producción, la primaria 10468 tiene 9 ligas privadas a fecha 24/09/2026; la desactivación no debe eliminarlas.
- Si no hay otra competición habilitada, Inicio, Liga, Mercado y Mi equipo muestran un estado vacío comprensible.
- Si se deshabilita una liga distinta de la activa, la selección actual del usuario permanece en la suya. Si era la activa, se elige otra liga disponible de forma determinista o ninguna.
- Competición inexistente, no monitorizada, ya deshabilitada y operaciones concurrentes reciben respuestas estables; la auditoría no inventa un éxito nuevo para un duplicado.
- Las cachés y páginas con revalidación deben invalidarse o comprobar el estado actualizado antes de mutar.

## Criterios de aceptación

1. Un administrador autorizado puede deshabilitar y volver a habilitar una competición desde el panel; hay auditoría e idempotencia.
2. Los equipos, jugadores y ligas privadas de una competición deshabilitada quedan fuera de todas las superficies Fantasy, incluidos enlaces directos y API; los de otras competiciones siguen disponibles.
3. Ninguna mutación Fantasy acepta IDs de una competición deshabilitada, incluso con una pantalla antigua abierta.
4. La monitorización FAB continúa cuando `monitored=true`, mientras la sincronización de plantillas y la puntuación Fantasy se detienen hasta la reactivación.
5. Deshabilitar y reactivar conserva identidades, ligas privadas, plantillas, saldos e historial sin duplicados.
6. Los tests cubren edición primaria, edición secundaria, ligas existentes, concurrencia, selección activa y reactivación; pasan los gates del repositorio.

## Alcance técnico

- `apps/web/**`: acción administrativa, API, filtros de lectura, guardas de escritura, selección de liga, estado suspendido y cachés.
- `services/fab_ingestor/**`: selección de fases Fantasy y comportamiento de jobs en carrera.
- `prisma/**` solo si es estrictamente necesario; los campos `fantasy_enabled` y `fantasy_role` ya existen.
- `docs/**`, `spec/**`, `progress/**`, tests.

## Recuperación

Rehabilitar la misma competición restablece la visibilidad de sus ligas y datos Fantasy preservados. El rollback de código conserva los campos existentes y no requiere migración destructiva.
