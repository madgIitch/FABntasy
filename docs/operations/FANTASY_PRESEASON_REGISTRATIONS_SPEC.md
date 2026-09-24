# Sprint 37 — Inscripciones de pretemporada y conciliación con boxscores

Estado: **aprobada el 24/09/2026** (`spec_approved: true`). La validación de la fuente FAB de plantillas sigue siendo condición de entrada para implementarla.

## Problema y objetivo

Hoy una competición monitorizada puede tener equipos y calendario completos, pero cero `PlayerRegistration` hasta que haya una boxscore elegible. Eso impide crear plantillas fantasy antes del primer partido. La nueva capacidad debe obtener de FAB las inscripciones publicadas para cada competición habilitada para fantasy, mantenerlas actualizadas por el scheduler y mediante una solicitud manual, y hacer que las boxscores usen esas mismas identidades. Una persona observada primero en una boxscore debe entrar también en el índice de inscripciones de su competición.

La identidad de la competición es `IdCompeticionCategoria`; una liga privada fantasy usa la `CompetitionSeason` correspondiente. Monitorizar una competición no activa fantasy por sí solo. El caso inicial es 1ª Senior Provincial Masculina 26/27 de Sevilla (9955); N1 masculina (10027) debe funcionar con el mismo contrato cuando se habilite.

## Condición de entrada: fuente de plantillas FAB

Antes de implementar la ingesta, identificar y validar una fuente FAB que publique jugadores de un equipo **antes de disputar partidos**. Documentar endpoint o recurso, parámetros, paginación, campos, respuesta vacía, autenticación y límites. Obtener fixtures saneados de al menos una plantilla de 9955 y una de 10027, si FAB las ha publicado. Comprobar con dos dispositivos que los identificadores elegidos para jugador, equipo y competición son estables y que pueden vincularse con el `componente_id` u otra identidad verificable de la boxscore.

El repositorio confirma `buscarEquipo`, `categoria/equipos` y estadísticas por partido, pero **todavía no confirma un endpoint de plantilla previa**. Si FAB no ofrece una fuente utilizable o una clave de jugador conciliable, esta spec queda bloqueada en esa condición: no se crean jugadores sintéticos, no se deducen identidades por nombre y se presenta `PLANTILLA_NO_DISPONIBLE` al operador. Cualquier fuente alternativa necesitará una decisión aprobada antes de implementarse.

## Selección y ciclo de sincronización

1. Una acción de administrador con `INGESTION_ADMIN` habilita una competición monitorizada para fantasy usando su ID FAB estable y su `CompetitionSeason`. La acción es auditada e idempotente. No altera otras competiciones ni convierte automáticamente todas las monitorizadas en ligas fantasy. Se conservan los roles `disabled`, `validation` y `primary` y el significado de `fantasy_enabled`.
2. Al habilitarla, se solicita una primera sincronización profunda. Mientras no exista un snapshot válido de jugadores, la competición muestra preparación pendiente y el usuario no recibe un mercado aparentemente completo. La creación o selección de plantillas utiliza únicamente `PlayerRegistration` verificadas o provisionales con procedencia visible según las reglas vigentes.
3. El scheduler sincroniza equipos, inscripciones, calendario y boxscores de las competiciones fantasy seleccionadas. En pretemporada, la fase de inscripciones tiene una antigüedad máxima de **seis horas** cuando FAB está disponible. La acción «Sincronizar ahora» ejecuta la misma fase sin esperar a la siguiente ventana. Ambas vías comparten lock por competición, rate limit, backoff, cancelación y resultados auditables.
4. La fase de inscripción recorre todos los equipos de la competición, valida que cada respuesta pertenece a su equipo/temporada y procesa páginas completas. Un fallo, página repetida, identidad ambigua o respuesta vacía no autoritativa conserva el último snapshot confirmado y deja error o cobertura parcial; nunca borra inscripciones ni declara cero jugadores por ausencia temporal.
5. El job expone por separado equipos, inscripciones observadas, creadas, actualizadas, provisionales y pendientes de conciliación, hora de última sincronización válida y error seguro. Emite heartbeat de progreso durante trabajos largos para que la consola no parezca detenida.

## Identidad y conciliación

- `Player` representa la identidad deportiva y `PlayerRegistration` su pertenencia a un equipo y `CompetitionSeason`. La clave canónica de jugador procede de un ID FAB estable **validado entre plantilla y boxscore**; los IDs opacos ligados a un dispositivo son solo handles de consulta. Nombre y dorsal son atributos mutables, no claves de unión.
- La plantilla y la boxscore hacen upsert sobre el mismo `Player` y la misma `PlayerRegistration` cuando comparten identidad verificable. La boxscore actualiza estadísticas sin cambiar el UUID de la inscripción ni las referencias de mercado, plantillas fantasy, precios y puntuación.
- Si una boxscore contiene un jugador aún no publicado en plantilla, se crea una inscripción provisional ligada al equipo y temporada correctos; aparece en el índice y se intenta conciliar en el siguiente barrido. Si aparece después la clave FAB verificada, se promueve la misma inscripción a confirmada. No se fusiona por coincidencia de texto; los casos ambiguos quedan pendientes de revisión y no producen dos jugadores comprables para una identidad confirmada.
- Un cambio de equipo o de nombre se resuelve por identidad y temporada, preservando historial deportivo y operaciones fantasy. Una desaparición en una respuesta parcial no retira ni elimina al jugador. La política de baja tras snapshots completos debe preservar los derechos y referencias de las plantillas fantasy existentes.
- Las operaciones son idempotentes: repetir la misma plantilla o boxscore, invertir su orden de llegada, cambiar de dispositivo FAB o reiniciar un job produce los mismos UUID y cardinales finales.

## Estados y presentación

La consola distingue **equipos sincronizados** de **plantillas de jugadores sincronizadas**. `COMPLETE` para equipos no implica que la plantilla esté lista. Para inscripciones se muestran `NOT_SYNCED`, `PARTIAL`, `COMPLETE`, `STALE`, `FAILED` y `PLANTILLA_NO_DISPONIBLE`, con fecha del último snapshot válido. Un cero solo es legítimo tras un recorrido completo y autoritativo de una fuente que confirma cero jugadores; si FAB todavía no ha publicado plantillas, se muestra pendiente o no disponible.

El producto fantasy usa los registros confirmados de la `CompetitionSeason` habilitada y evita mezclar ligas, categorías o temporadas. La disponibilidad de jugadores antes del primer partido no depende de que existan `PlayerGameStat` o precios dinámicos: se usa el precio inicial ya definido hasta que haya datos deportivos.

## Seguridad, rendimiento y compatibilidad

El navegador no consulta FAB. Se guardan RAW saneados y checksum sin claves de dispositivo, tokens ni datos personales innecesarios en logs o vistas administrativas. La ingesta respeta las reglas actuales de acceso, aislamiento por liga, rate limiting y circuit breaker. Las escrituras se agrupan en lotes y transacciones acotadas, con reanudación e idempotencia; una temporada con cientos de jugadores no debe mantener una única transacción durante todo el barrido.

Los cambios de esquema, si hacen falta, serán aditivos. La desactivación o rollback del nuevo sincronizador conserva jugadores, inscripciones, boxscores, plantillas fantasy, compras y auditoría. La fase actual de estadísticas sigue funcionando durante un despliegue gradual.

## Criterios de aceptación

1. Existe evidencia reproducible y fixtures saneados de la fuente FAB de plantillas antes de partidos, o la ejecución se detiene con `PLANTILLA_NO_DISPONIBLE` sin inventar registros.
2. Habilitar una competición monitorizada para fantasy por ID estable inicia su preparación; la sincronización periódica y «Sincronizar ahora» obtienen las mismas inscripciones sin duplicar jobs ni identidades.
3. Una plantilla FAB publicada antes de la primera jornada crea jugadores seleccionables con su equipo, temporada y precio inicial; no necesita boxscores.
4. Un jugador de plantilla que aparece en una boxscore conserva exactamente un `Player` y una `PlayerRegistration`, incluso si cambian nombre, dorsal u opaco de dispositivo.
5. Un jugador encontrado primero en una boxscore aparece en el índice como provisional y se concilia con la plantilla posterior mediante identidad verificada, conservando referencias existentes.
6. Una respuesta fallida, parcial, vacía no autoritativa o ambigua no elimina ni mezcla datos; el operador ve cobertura y error correctos y puede reintentar.
7. Los conteos y estados diferencian cobertura de equipos, de jugadores y de estadísticas, con timestamps y progreso para jobs largos.
8. Tests sin red e integración PostgreSQL cubren ambos órdenes de llegada, repetición, dos dispositivos, homónimos, traspasos, ausencias, rollback, locks y estabilidad de referencias fantasy. Un smoke de solo lectura previo y uno de escritura controlada validan 9955; 10027 se valida con el mismo contrato cuando sea habilitada.
9. Pasan typecheck, lint, pruebas web y Python, las integraciones configuradas y diff-scope. El despliegue puede revertirse sin borrar datos normalizados.

## Condiciones pendientes de validación antes de la ingesta

- ¿Qué fuente FAB publica la plantilla previa y qué identificador de jugador comparte con las boxscores? Se resolverá con la validación del contrato anterior; hoy no hay evidencia en el repo.
- Si FAB no publica plantillas a tiempo, ¿se aprueba una fuente alternativa verificable o debe permanecer la competición sin jugadores seleccionables? Esta spec propone permanecer pendiente hasta decidirlo.
- ¿Cuándo una baja confirmada deja de estar disponible para nuevas compras? Se preservarán siempre las referencias existentes; la regla de mercado requiere decisión de producto si surge antes del inicio.
