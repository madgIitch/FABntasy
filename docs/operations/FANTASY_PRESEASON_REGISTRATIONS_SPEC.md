# Sprint 37 — Inscripciones de pretemporada y conciliación con boxscores

Estado: **revisión aprobada el 24/09/2026** (`spec_approved: true`). La fuente FAB de plantillas ya está identificada; la conciliación de identidades se valida progresivamente.

Validación de entrada del 24/09/2026: [la investigación de la fuente FAB](FAB_PRESEASON_ROSTER_SOURCE_VALIDATION.md) encontró plantillas previas en 10027, pero ningún jugador publicado en 9955. El `Id` de jugador de la ficha cambia entre dispositivos y todavía no se ha comprobado un ID común con `componente_id` de boxscores. Esta revisión autoriza la carga de fichas con identidad provisional y una conciliación controlada por nombre, equipo, competición y temporada; nunca se considera verificado un enlace que solo se apoya en texto.

## Problema y objetivo

Hoy una competición monitorizada puede tener equipos y calendario completos, pero cero `PlayerRegistration` hasta que haya una boxscore elegible. Eso impide crear plantillas fantasy antes del primer partido. La nueva capacidad debe obtener de FAB las inscripciones publicadas para cada competición habilitada para fantasy, mantenerlas actualizadas por el scheduler y mediante una solicitud manual, y hacer que las boxscores usen esas mismas identidades. Una persona observada primero en una boxscore debe entrar también en el índice de inscripciones de su competición.

La identidad de la competición es `IdCompeticionCategoria`; una liga privada fantasy usa la `CompetitionSeason` correspondiente. Monitorizar una competición no activa fantasy por sí solo. El caso inicial es 1ª Senior Provincial Masculina 26/27 de Sevilla (9955); N1 masculina (10027) debe funcionar con el mismo contrato cuando se habilite.

## Condición de entrada: fuente de plantillas FAB

La fuente `POST /v2/equipo.ashx`, `accion=jugadores`, publica jugadores de algunos equipos antes de disputar partidos. Documentar endpoint, parámetros, campos, respuesta vacía, autenticación y límites. Obtener fixtures saneados de 9955 y 10027 cuando FAB publique esas fichas. Comprobar con dos dispositivos qué IDs son estables y contrastar un mismo jugador de ficha y boxscore en cuanto haya una boxscore real disponible.

Si un equipo no tiene fichas publicadas, se presenta `PLANTILLA_NO_DISPONIBLE` y se reintenta sin declarar cero jugadores ni inventar registros. La ausencia de ID compartido no bloquea cargar una ficha publicada: se le asigna identidad interna provisional, con procedencia y calidad de conciliación visibles. No se eleva una coincidencia textual a identidad FAB verificada.

## Selección y ciclo de sincronización

1. Una acción de administrador con `INGESTION_ADMIN` habilita una competición monitorizada para fantasy usando su ID FAB estable y su `CompetitionSeason`. La acción es auditada e idempotente. No altera otras competiciones ni convierte automáticamente todas las monitorizadas en ligas fantasy. Se conservan los roles `disabled`, `validation` y `primary` y el significado de `fantasy_enabled`.
2. Al habilitarla, se solicita una primera sincronización profunda. Mientras no exista un snapshot válido de jugadores, la competición muestra preparación pendiente y el usuario no recibe un mercado aparentemente completo. La creación o selección de plantillas utiliza únicamente `PlayerRegistration` verificadas o provisionales con procedencia visible según las reglas vigentes.
3. El scheduler sincroniza equipos, inscripciones, calendario y boxscores de las competiciones fantasy seleccionadas. En pretemporada, la fase de inscripciones tiene una antigüedad máxima de **seis horas** cuando FAB está disponible. La acción «Sincronizar ahora» ejecuta la misma fase sin esperar a la siguiente ventana. Ambas vías comparten lock por competición, rate limit, backoff, cancelación y resultados auditables.
4. La fase de inscripción recorre todos los equipos de la competición, valida que cada respuesta pertenece a su equipo/temporada y procesa páginas completas. Un fallo, página repetida, identidad ambigua o respuesta vacía no autoritativa conserva el último snapshot confirmado y deja error o cobertura parcial; nunca borra inscripciones ni declara cero jugadores por ausencia temporal.
5. El job expone por separado equipos, inscripciones observadas, creadas, actualizadas, provisionales y pendientes de conciliación, hora de última sincronización válida y error seguro. Emite heartbeat de progreso durante trabajos largos para que la consola no parezca detenida.

## Identidad y conciliación

- `Player` representa la identidad deportiva y `PlayerRegistration` su pertenencia a un equipo y `CompetitionSeason`. El `Id` opaco de una ficha solo sirve como handle de consulta y nunca como clave permanente. Se intenta primero una unión mediante ID FAB compartido **tras comprobarla sobre un mismo jugador real**; hasta entonces el ID interno de la ficha es provisional.
- Cuando no haya ID compartido, el fallback calcula candidatos por nombre y apellidos normalizados, equipo con ID estable, competición y temporada. Solo se enlaza automáticamente una pareja **única en ambos conjuntos**, con confianza `TENTATIVE`, procedencia auditable y sin contradicción de equipo ni identidad ya verificada. Dorsal o nombre pueden ayudar a diagnosticar, pero no fuerzan una unión. Una unión tentativa se reevalúa al llegar nuevos datos.
- La plantilla y la boxscore actualizan el mismo `Player` y la misma `PlayerRegistration` cuando comparten identidad verificada o una conciliación tentativa única admitida. Una promoción a verificada conserva los UUID y referencias de mercado, plantillas fantasy, precios y puntuación. Si evidencia posterior contradice una unión tentativa, se detiene la conciliación automática de esa identidad, se alerta al operador y no se reasignan estadísticas o referencias sin una corrección auditada.
- Si una boxscore contiene un jugador aún no publicado en plantilla, se crea una inscripción provisional ligada al equipo y temporada correctos; aparece en el índice y se intenta conciliar en el siguiente barrido. Los homónimos o múltiples candidatos quedan pendientes de revisión y no producen una fusión automática.
- Un cambio de equipo o de nombre se resuelve por identidad y temporada, preservando historial deportivo y operaciones fantasy. Una desaparición en una respuesta parcial no retira ni elimina al jugador. La política de baja tras snapshots completos debe preservar los derechos y referencias de las plantillas fantasy existentes.
- Las operaciones son idempotentes: repetir la misma plantilla o boxscore, invertir su orden de llegada, cambiar de dispositivo FAB o reiniciar un job produce los mismos UUID y cardinales finales cuando la identidad es única. Una ficha con nombre, equipo y temporada idénticos a otra ficha sin clave estable constituye ambigüedad, no un segundo UUID inferido de la posición de la lista.

## Estados y presentación

La consola distingue **equipos sincronizados** de **plantillas de jugadores sincronizadas**. `COMPLETE` para equipos no implica que la plantilla esté lista. Para inscripciones se muestran `NOT_SYNCED`, `PARTIAL`, `COMPLETE`, `STALE`, `FAILED` y `PLANTILLA_NO_DISPONIBLE`, con fecha del último snapshot válido. Un cero solo es legítimo tras un recorrido completo y autoritativo de una fuente que confirma cero jugadores; si FAB todavía no ha publicado plantillas, se muestra pendiente o no disponible.

El producto fantasy usa fichas publicadas de la `CompetitionSeason` habilitada, muestra si su identidad es provisional o verificada y evita mezclar ligas, categorías o temporadas. Las uniones tentativas solo se usan cuando son únicas y sin conflicto; cualquier caso ambiguo se oculta de nuevas compras hasta revisión. La disponibilidad de jugadores antes del primer partido no depende de que existan `PlayerGameStat` o precios dinámicos: se usa el precio inicial ya definido hasta que haya datos deportivos.

## Seguridad, rendimiento y compatibilidad

El navegador no consulta FAB. Se guardan RAW saneados y checksum sin claves de dispositivo, tokens ni datos personales innecesarios en logs o vistas administrativas. La ingesta respeta las reglas actuales de acceso, aislamiento por liga, rate limiting y circuit breaker. Las escrituras se agrupan en lotes y transacciones acotadas, con reanudación e idempotencia; una temporada con cientos de jugadores no debe mantener una única transacción durante todo el barrido.

Los cambios de esquema, si hacen falta, serán aditivos. La desactivación o rollback del nuevo sincronizador conserva jugadores, inscripciones, boxscores, plantillas fantasy, compras y auditoría. La fase actual de estadísticas sigue funcionando durante un despliegue gradual.

## Criterios de aceptación

1. Existe evidencia reproducible y fixtures saneados de la fuente FAB de plantillas antes de partidos; un equipo sin fichas publicadas muestra `PLANTILLA_NO_DISPONIBLE` sin inventar registros.
2. Habilitar una competición monitorizada para fantasy por ID estable inicia su preparación; la sincronización periódica y «Sincronizar ahora» obtienen las mismas inscripciones sin duplicar jobs ni identidades.
3. Una plantilla FAB publicada antes de la primera jornada crea jugadores seleccionables con su equipo, temporada y precio inicial; no necesita boxscores.
4. Un jugador de plantilla que aparece en una boxscore conserva exactamente un `Player` y una `PlayerRegistration` mediante ID compartido verificado o fallback único y tentativo; cambiar de dispositivo no crea duplicados. El cambio de nombre o dorsal no rompe una unión ya verificada por ID.
5. Un jugador encontrado primero en una boxscore aparece en el índice como provisional y se concilia con la plantilla posterior mediante ID verificado o fallback único, conservando referencias existentes y la confianza de cada enlace.
6. Una respuesta fallida, parcial, vacía no autoritativa o ambigua no elimina ni mezcla datos; el operador ve cobertura y error correctos y puede reintentar.
7. Los conteos y estados diferencian cobertura de equipos, de jugadores y de estadísticas, con timestamps y progreso para jobs largos.
8. Tests sin red e integración PostgreSQL cubren ambos órdenes de llegada, repetición, dos dispositivos, nombres con tildes, homónimos, traspasos, contradicciones posteriores, ausencias, rollback, locks y estabilidad de referencias fantasy. Un smoke de solo lectura y uno de escritura controlada validan 9955 cuando FAB publique fichas; 10027 se valida con el mismo contrato cuando sea habilitada.
9. Pasan typecheck, lint, pruebas web y Python, las integraciones configuradas y diff-scope. El despliegue puede revertirse sin borrar datos normalizados.

## Condiciones pendientes de validación antes de la ingesta

- ¿Existe un identificador de jugador compartido entre la plantilla y `componente_id`? Se verificará con un mismo jugador de una boxscore real. Hasta comprobarlo, la conciliación por texto siempre queda marcada como tentativa.
- Si FAB no publica las fichas de 9955 a tiempo, esa competición permanecerá con `PLANTILLA_NO_DISPONIBLE` y sin jugadores inventados.
- ¿Cuándo una baja confirmada deja de estar disponible para nuevas compras? Se preservarán siempre las referencias existentes; la regla de mercado requiere decisión de producto si surge antes del inicio.
