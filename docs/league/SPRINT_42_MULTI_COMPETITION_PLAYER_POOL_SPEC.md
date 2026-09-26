# Sprint 42 · Selección de competiciones para una liga Fantasy

Estado: **aprobada por el usuario el 26/09/2026**.

## Objetivo

Al crear una liga privada, su propietario elige una o varias competiciones-temporada habilitadas para Fantasy. Los jugadores inscritos en esas ediciones forman el universo elegible de la liga, sin mezclar jugadores de ediciones que no se hayan seleccionado.

## Contexto y alcance

Hoy `FantasyLeague`, `FantasyTeam`, mercado, plantilla, puntuación y jornadas dependen de un único `competitionSeasonId`. El formulario de creación ofrece una selección única. Esta feature cambia el contrato de la liga completa; un selector múltiple aislado dejaría operaciones incompatibles.

- La selección se hace **solo al crear** la liga y queda fija después de la primera confirmación. La edición de la selección en ligas existentes queda fuera de esta propuesta.
- Una liga existente se migra a un conjunto de una sola competición-temporada, conservando exactamente su comportamiento, miembros, equipos, invitaciones, saldos, transacciones e historial.
- `fantasy_enabled=true` es la condición autoritativa de elegibilidad. Estar monitorizada por FAB o figurar en el catálogo no basta. Se eligen ediciones concretas, no nombres genéricos de competición.
- Se mantiene el límite de 20 miembros y el resto de reglas de invitación y privacidad.

## Experiencia de creación

1. **Perfil → Mis ligas → Crear liga** y el onboarding muestran una lista de competiciones-temporada Fantasy habilitadas, con nombre y temporada, casillas de selección y estado de carga/error.
2. Debe seleccionarse al menos una edición. No se preseleccionan ediciones ocultas o deshabilitadas. Si solo hay una disponible, se puede mostrar marcada por defecto, pero el formulario indica claramente la selección.
3. Antes de confirmar se resumen nombre y competiciones elegidas. Tras crear, la ficha de la liga, Mis ligas y la landing de invitación muestran el conjunto seleccionado.
4. Si no hay ninguna edición habilitada, se explica que no se puede crear una liga en este momento y se desactiva la confirmación. Si una edición deja de estar disponible con el formulario abierto, el servidor rechaza la creación y la UI permite actualizar la lista sin perder el nombre.
5. El control es operable por teclado y lector de pantalla y funciona desde 320 px.

## Contrato de datos y API propuesto

- Crear una relación explícita `league_competition_seasons` con clave única `(league_id, competition_season_id)` y una edición **principal** por liga. La edición principal determina el calendario de jornadas de la liga; pertenece obligatoriamente al conjunto. El propietario la elige durante la creación. Con una sola edición, esta es principal automáticamente.
- `POST /api/fantasy/leagues` acepta `{ name, competitionSeasonIds: string[], primaryCompetitionSeasonId: string }`. Se rechazan lista vacía, duplicados, IDs inválidos, principal ausente del conjunto y ediciones no habilitadas. El servidor crea liga, relaciones, OWNER e invitación en una transacción. El contrato antiguo `{competitionSeasonId}` deja de ser válido para crear ligas nuevas después del despliegue coordinado; las ligas persistidas sí se migran.
- Las respuestas de liga exponen las ediciones seleccionadas y su principal. Durante una transición aditiva, el `competitionSeasonId` existente conserva el significado de edición principal para consumidores antiguos, pero nunca se usa como único filtro de jugadores de una liga multicompetición.
- Toda consulta o mutación de plantilla, mercado, ofertas y cláusulas valida que el `PlayerRegistration.competitionSeasonId` pertenezca al conjunto de la liga. El precio de cada jugador sigue siendo el precio global de su propia edición. La regla de máximo dos jugadores por equipo real sigue usando `teamRegistrationId`.
- La identidad de usuario procede de Supabase Auth. El cliente no decide el conjunto autoritativo ni puede ampliar una liga mediante IDs enviados en operaciones posteriores.

## Jornadas y puntuación propuestas

- La edición principal define el número y las ventanas de cada jornada de la liga. Un partido de cualquiera de las ediciones seleccionadas aporta puntos a la jornada de liga cuya ventana temporal contiene su hora de inicio. Cada partido puede pertenecer a una sola jornada de esa liga; los partidos fuera de las ventanas no puntúan para ella.
- Los puntos de un jugador se calculan con el ruleset de **su propia competición-temporada**. La clasificación de la liga suma esos resultados en la jornada de liga correspondiente, sin recalcular ni normalizar conjuntamente poblaciones de ediciones distintas.
- El cierre de alineación de la jornada se determina por la ventana de la edición principal y debe ocurrir antes del primer partido elegible de **cualquiera** de las ediciones seleccionadas dentro de esa ventana. Un aplazamiento posterior al cierre no reabre la alineación ni reescribe snapshots cerrados. La UI muestra hora y zona `Europe/Madrid`.
- La creación admite ediciones sin calendario publicado. La interfaz indica que los partidos fuera de las ventanas de la edición principal no puntúan. Si la edición principal aún no tiene calendario, la liga puede crearse, pero las alineaciones y puntuaciones esperan a que se publiquen sus jornadas.

## Deshabilitación y compatibilidad

- Si se deshabilita una edición seleccionada, sus jugadores dejan de poder incorporarse o negociarse de inmediato. Sus registros e historial permanecen. Las ligas con otras ediciones habilitadas siguen accesibles y usan únicamente estas para nuevas operaciones. La suspensión completa se reserva para cuando ninguna edición seleccionada esté habilitada.
- Si se deshabilita la edición principal, la liga no cambia automáticamente de calendario: quedan en pausa las nuevas alineaciones y puntuaciones de jornadas hasta que se reactive.
- Se conservan los snapshots y puntos históricos. Reactivar la misma edición restituye la elegibilidad sin duplicar ligas, jugadores ni transacciones.
- La migración es aditiva y rellena una relación por liga existente; no borra la columna principal durante este sprint. Durante el despliegue, la creación multicompetición se activa después de migrar todos los lectores y escritores. Si se revierte el código, se desactiva la creación nueva y se dejan las ligas multicompetición en solo lectura hasta restaurar el código compatible; no se colapsan ni borran sus datos.
- El interruptor de reversión es `MULTI_COMPETITION_LEAGUES_ENABLED=false`; con la migración y el código compatibles desplegados, la creación múltiple está disponible por defecto.

## Criterios de aceptación

1. La creación permite elegir una o varias ediciones habilitadas y una principal; no presenta ediciones deshabilitadas y rechaza en servidor una selección obsoleta o manipulada.
2. Jugadores, búsqueda, plantilla, mercado rotatorio, ofertas, venta y cláusula de una liga usan exactamente su conjunto seleccionado. No se filtran jugadores de otra liga ni de otra edición.
3. Puntuación, cierre y clasificación aplican de forma coherente la política de jornadas multicompetición acordada; cada partido cuenta a lo sumo una vez por liga y se usa el ruleset de su edición.
4. Una liga preexistente mantiene el comportamiento de una sola edición y conserva todos sus datos tras la migración.
5. Deshabilitar o rehabilitar una edición aplica las reglas anteriores incluso ante peticiones concurrentes y pantallas abiertas.
6. Tests unitarios, integración PostgreSQL y E2E cubren selección, permisos, carreras de deshabilitación, migración, jornadas, mercado, puntuación y accesibilidad. Pasan `corepack pnpm typecheck`, `lint`, `test` y `diff-scope`.

## Decisiones fijadas al aprobar

1. La selección queda fija al crear la liga.
2. La edición principal define jornadas mediante ventanas temporales contiguas: una ventana comienza en el primer partido programado de su jornada y termina justo antes del primer partido programado de la siguiente. Si un partido cambia de fecha antes del cierre, se reevalúa su asignación; después del cierre se mantiene el snapshot publicado y las correcciones siguen el flujo histórico de datos.
3. Los partidos fuera de ventana no puntúan; deshabilitar la edición principal pausa nuevas jornadas.
4. El despliegue es aditivo y reversible en solo lectura para ligas multicompetición durante un rollback.

## Scope propuesto

- `apps/web/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`
