# Arquitectura

> El agente lo lee antes de implementar. Mantén aquí el contexto que no cabe en una feature concreta.

## Visión general

Producto/proyecto:

Usuarios principales:

Objetivo no negociable:

## Componentes

- (rellenar) Componente:
  - Responsabilidad:
  - Entradas/salidas:
  - Dueño/riesgo:

## Flujo de datos

1. (rellenar)

## Integraciones externas

- (rellenar) Servicio/API:
  - Contrato:
  - Credenciales/config:
  - Entorno local/CI:

## Restricciones conocidas

- (rellenar) Rendimiento, seguridad, compatibilidad, despliegue, coste, etc.

## Decisiones abiertas

- (rellenar) Preguntas que bloquean diseño futuro.

<!-- Los specs aprobados se anexan debajo con marcadores harness:<id>. -->

<!-- harness:sprint-0-project-foundation -->
## sprint-0-project-foundation · Sprint 0 - Project Foundation



### Scope aprobado

  - `apps/web/**`
  - `services/fab_ingestor/**`
  - `packages/**`
  - `prisma/**`
  - `tests/**`
  - `.github/workflows/**`
  - `.env.example`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** La fundación solo crea el esqueleto de Prisma y una migración inicial vacía; no modela entidades deportivas.
- **external_contracts:** Sprint 0 no realiza llamadas reales a FAB; solo deja interfaces/configuración preparada para el Sprint 1.
- **edge_cases:** La configuración debe validar variables ausentes y separar entorno cliente de servidor sin exponer secretos.
- **ui_states:** La PWA solo necesita un shell mínimo arrancable, sin flujos de producto ni datos simulados de fantasy.

<!-- harness:sprint-1-fab-client -->
## sprint-1-fab-client · Sprint 1 - FAB Client



### Scope aprobado

  - `services/fab_ingestor/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** Las credenciales se abstraen tras un almacén server-side con sustitución atómica; las respuestas RAW son opcionales y deben quedar anonimizadas.
- **external_contracts:** El cliente usa POST form-urlencoded contra /dispositivo.ashx y /v2/busqueda.ashx según los contratos FAB ya confirmados.
- **edge_cases:** La paginación avanza secuencialmente mediante skip, termina ante página vacía o incompleta y evita concurrencia sobre el mismo recurso.
- **ui_states:** La feature no incorpora interfaz de usuario; expone un cliente Python reemplazable para el ingestor.

<!-- harness:sprint-2-sports-data-model -->
## sprint-2-sports-data-model · Sprint 2 - Sports Data Model



### Scope aprobado

  - `prisma/**`
  - `apps/web/src/server/**`
  - `services/fab_ingestor/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** Prisma define UUID internos y relaciones normalizadas para federación, competición, temporada, edición, grupo, jornada, equipo, inscripción, jugador, inscripción, partido, estadísticas, identificadores externos y payloads RAW. Los repositorios Python realizan UPSERT sobre claves naturales documentadas.
- **external_contracts:** `external_ids` usa `source`, `entity_type`, `external_id` y `entity_id`; conserva IDs opacos como texto y establece unicidad por fuente, tipo e ID externo. Prisma gobierna migraciones y Python escribe directamente en PostgreSQL.
- **edge_cases:** Los campos aún no publicados por FAB son nullable; un jugador sin identificador estable puede conservar identidad provisional por fuente y contexto, sin fusionarse por nombre; partidos reprogramados actualizan el mismo registro.
- **ui_states:** No hay UI en este sprint; las consultas de servidor solo exponen datos deportivos normalizados y nunca payloads RAW por defecto.

<!-- harness:sprint-3-active-competition-discovery -->
## sprint-3-active-competition-discovery · Sprint 3 - Active Competition Discovery



### Scope aprobado

  - `services/fab_ingestor/**`
  - `prisma/**`
  - `apps/web/src/server/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** La categoría FAB seleccionada se representa como Competition + CompetitionSeason y conserva `Id`, `IdCompeticionCategoria`, categoría, competición y delegación mediante external IDs y metadatos normalizados. Se añade una marca primaria protegida por índice único parcial.
- **external_contracts:** Discovery usa exclusivamente `buscarCategoria`. La APK confirma que la enumeración exhaustiva parte de `/v2/categoria.ashx`: `accion=fasesGrupos` usa `id_categoria_competicion`, y `accion=equipos` usa `id_fase`, `id_grupo`, `jornada`, `tipo_fase` y `ventana`. Ambos contratos se validaron también contra Copa Delegación real.
- **edge_cases:** El nombre no determina temporada ni identidad; los IDs opacos permanecen texto; repetir selección/sync es idempotente; `DESCANSA` se descarta como marcador de calendario; si un equipo aparece en más de un grupo/fase, su TeamRegistration no recibe un grupo ambiguo.
- **ui_states:** La administración inicial es CLI: listado de candidatos, selección explícita por `IdCompeticionCategoria` y resumen de sync; no se implementa UI web en este sprint.

<!-- harness:sprint-4-schedule-and-games-ingestion -->
## sprint-4-schedule-and-games-ingestion · Sprint 4 - Schedule and Games Ingestion



### Scope aprobado

  - `services/fab_ingestor/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** Game conserva el ID FAB estable, equipos, fase/grupo/ronda, jornada, horario con zona Europe/Madrid, estado y resultado. Se añade un estado de sincronización para distinguir registros presentes y stale sin borrarlos.
- **external_contracts:** La APK confirma `/v2/categoria.ashx`: `Jornadas` y `horariosJornadas` usan `id_categoria_competicion`, `id_fase`, `id_grupo`, `id_ronda`, `fecha_inicial` y `fecha_final`. Se validarán respuestas reales de Copa Delegación antes de normalizar.
- **edge_cases:** `DESCANSA` no crea partidos; aplazamientos y cambios de hora actualizan el mismo Game por ID FAB; valores o equipos no resolubles bloquean ese recorrido sin fusionar por nombre.
- **ui_states:** La operación del sprint es CLI (`sync-competition-games`); no se añade interfaz web.

<!-- harness:sprint-5-boxscore-ingestion -->
## sprint-5-boxscore-ingestion · Sprint 5 - Boxscore Ingestion



### Scope aprobado

  - `services/fab_ingestor/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Player, PlayerRegistration y PlayerGameStat reciben identidad FAB, equipo/partido y estadísticas nullable. Game conserva el estado de validación del boxscore.
- **external_contracts:** La APK confirma POST `/v2/envivo/estadisticas.ashx` con `id_dispositivo`, `key` e `id_partido`. Una llamada real sobre un partido ACB terminado de la XXIX Copa Andalucía (02/09/2026, `TipoActa=ESTADÍSTICAS`) devolvió `resultado=correcto`, 13 jugadores por equipo y los campos requeridos por el mapper.
- **edge_cases:** Ausencia no equivale a cero; jugadores sin ID estable son provisionales y se separan por fuente/equipo; correcciones posteriores actualizan filas sin borrar auditoría RAW.
- **ui_states:** Operación CLI; no se añade interfaz web en este sprint.

<!-- harness:sprint-6-ingestion-orchestrator -->
## sprint-6-ingestion-orchestrator · Sprint 6 - Ingestion Orchestrator



### Scope aprobado

  - `services/fab_ingestor/**`
  - `prisma/**`
  - `infrastructure/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** `ingestion_runs` registra job, competición, timestamps, estado, contadores JSON no sensibles y `error_code`; no almacena trazas, credenciales ni payloads.
- **external_contracts:** Reutiliza los clientes y contratos FAB ya validados en Sprints 1–5; el orquestador no introduce endpoints nuevos.
- **edge_cases:** PostgreSQL advisory locks evitan solapes incluso entre procesos; una terminación libera el lock con la conexión; `stats_final` se salta salvo `--force-stats`.
- **ui_states:** Sin UI; operación por CLI, logs estructurados y tabla `ingestion_runs`.

<!-- harness:sprint-7-pwa-auth-shell -->
## sprint-7-pwa-auth-shell · Sprint 7 - PWA Auth and Shell



### Scope aprobado

  - `apps/web/**`
  - `prisma/**`
  - `packages/**`
  - `tests/**`
  - `public/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** Perfil de aplicación enlazado uno a uno con el UUID de Supabase Auth; la contraseña no se replica en Prisma.
- **external_contracts:** Supabase Auth por email/contraseña con verificación y recuperación por correo mediante SDK SSR oficial.
- **edge_cases:** Redirecciones seguras, refresh de sesión, múltiples pestañas y retorno desde enlaces de verificación o recuperación.
- **ui_states:** Shell responsive con estados de carga, error y offline; navegación privada protegida.

<!-- harness:sprint-8-sports-explorer -->
## sprint-8-sports-explorer · Sprint 8 - Sports Explorer



### Scope aprobado

  - `apps/web/**`
  - `packages/domain/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Usa exclusivamente el modelo deportivo normalizado existente; los agregados se derivan de player_game_stats y no se persisten como nueva fuente de verdad.
- **external_contracts:** La API pública propia expone competición, equipos, partidos y jugadores desde PostgreSQL y pagina los listados grandes.
- **edge_cases:** Contempla partidos sin estadísticas, campos nullable, listados grandes paginados y datos todavía no sincronizados.
- **ui_states:** Incluye clasificación/calendario, ficha de partido con o sin boxscore, ficha de jugador, búsqueda y filtros básicos.

<!-- harness:sprint-9-fantasy-scoring-engine -->
## sprint-9-fantasy-scoring-engine · Sprint 9 - Fantasy Scoring Engine



### Scope aprobado

  - `packages/domain/**`
  - `prisma/**`
  - `apps/web/src/server/**`
  - `apps/web/src/app/**`
  - `apps/web/src/components/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** FantasyScoringRuleSet es inmutable, versionado y asociado como mínimo a competitionSeason y tipo de cálculo. Sus parámetros declarativos incluyen fórmula, coeficientes, estadísticas requeridas, normalización, muestra mínima, límites, DNP, bonus y redondeo. FantasyPlayerGameScore referencia PlayerGameStat, jugador, partido, ruleset y source_stats_version; persiste raw_score y normalized_score nullable, estado, código estable, breakdown JSON y timestamps. source_stats_version es el SHA-256 del snapshot canónico y existe unicidad por (player_game_stat_id, ruleset_id, source_stats_version). Las identidades dudosas no se fusionan entre temporadas.
- **external_contracts:** El contrato server-side documenta tipos y nullabilidad para status, errorCode nullable, playerId, gameId, competitionId, competitionSeasonId, rawScore nullable, normalizedFantasyPoints nullable, rulesetId, rulesetVersion, sourceStatsVersion y breakdown. El breakdown mantiene orden canónico según el orden de términos declarado por el ruleset y contiene rawTerms, normalization y finalScore; cada término conserva estadística o expresión, valor original nullable, coeficiente o condición, contribución Decimal sin redondear y valor presentado cuando corresponda. El score se obtiene de la suma Decimal sin redondear y se redondea únicamente al final, no sumando contribuciones ya redondeadas. Las respuestas no calculables o pendientes usan status y errorCode estables con scores null. La versión activa o solicitada siempre es explícita y las versiones nuevas son aditivas.
- **edge_cases:** El ruleset v1 queda definido y explícitamente calibrable. Provincial: RawProv = PTS + 0.50×3PM + 0.25×FTM - 0.50×FC; 2PM no se suma porque ya está contenido en PTS. Nacional: RawNac = PTS + 1.20×REB + 1.50×AST + 3.00×STL + 3.00×BLK - 1.50×TO - 0.50×(FGA-FGM) - 0.50×(FTA-FTM) - 0.50×FC. v1 no aplica bonus y permite raw negativos. La población de normalización contiene las actuaciones calculables, no-DNP, de la misma competitionSeason y jornada. Usa media y desviación estándar poblacional: Z=(raw-media)/desviación y FP=clamp(20+10×Z,0,50). Requiere al menos 20 actuaciones y desviación mayor que cero. Los empates de raw reciben el mismo Z y FP. DNP exige minutos=0 y todas las estadísticas presentes=0, produce 0 FP y queda fuera de la población. Se usa Decimal sin redondeos intermedios; raw y FP se redondean al final a una decimal mediante half-up. Los parámetros se conservan dentro de cada versión y toda recalibración crea una versión nueva.
- **ui_states:** La ficha de jugador y el boxscore muestran los FP normalizados como cifra principal y un desglose expandible con fórmula, términos brutos, población de referencia, posición relativa y transformación final. Identifican competición, temporada y versión; distinguen mediante texto calculado, DNP, pendiente por muestra, datos incompletos, error y recalculado. No convierten ausencias en cero y funcionan desde 320 px sin scroll horizontal involuntario.

<!-- harness:sprint-10-fantasy-team-roster -->
## sprint-10-fantasy-team-roster · Sprint 10 - Fantasy Team and Roster



### Scope aprobado

  - `prisma/**`
  - `packages/domain/**`
  - `apps/web/src/server/**`
  - `apps/web/src/app/**`
  - `apps/web/src/components/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Se define una FantasyTeam única por usuario y competitionSeason, una plantilla exacta de 7 jugadores con 5 titulares y 2 suplentes, sin posiciones, un máximo de 2 jugadores por equipo real y unicidad de jugador en plantilla y snapshot. La fuente autoritativa inicial es el ruleset cold-start, que asigna 3000000 créditos a todos los jugadores. El acquisition_price se captura dentro de la transacción que confirma el roster y permanece inmutable. Cuando Sprint 11 active precios dinámicos, se captura el precio vigente persistido y la ausencia de precio se rechaza con 409 PRICE_UNAVAILABLE.
- **external_contracts:** Se especifican métodos, rutas, queries y requests de los GET y PUT, el envelope fantasy-team-api.v1, expectedVersion, importes enteros en créditos, timestamps ISO 8601 UTC, nullabilidad y códigos de error. Los GET correctos devuelven 200, el PUT de creación inicial 201 y el PUT de reemplazo 200. Cada elemento de roster contiene playerRegistrationId, playerId, displayName, realTeamId, realTeamName, acquisitionPrice y currentMarketPrice; solo currentMarketPrice puede ser null. lineup es null o contiene roundNumber, status, cutoffAt, lockedAt, starters y substitutes; status es DRAFT o LOCKED, lockedAt es null en DRAFT e ISO UTC en LOCKED, y starters y substitutes contienen snapshots con los mismos campos del roster.
- **edge_cases:** El bloqueo es inclusivo. El instante decisivo es clock_timestamp() de PostgreSQL leído dentro de la transacción, tras bloquear la jornada e inmediatamente antes de persistir, por lo que una petición iniciada antes del cutoff puede ser rechazada si llega a ese punto en o después del cierre. El cutoff se recalcula por reprogramaciones anteriores al cierre, se fija al bloquearse, nunca reabre y su ausencia produce 409 CUTOFF_UNAVAILABLE.
- **ui_states:** La UI contempla carga, vacío guiado, guardado, éxito, validación, conflicto y alineación bloqueada. Ante VERSION_CONFLICT conserva el borrador hasta que el usuario recarga o reaplica, sin reintento automático. Offline no envía ni encola cambios y conserva solo el borrador local. Con la feature desactivada, los datos históricos permanecen en solo lectura.

<!-- harness:sprint-11-player-pricing -->
## sprint-11-player-pricing · Sprint 11 - Player Pricing



### Scope aprobado

  - `apps/web/**`
  - `packages/domain/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Precio vigente separado de eventos históricos y de la cláusula derivada.
- **external_contracts:** Job, lectura y función de cláusula definidos.
- **edge_cases:** Cold start, ventanas, límites, redondeo y correcciones decididos.
- **ui_states:** Estados y responsive definidos.

<!-- harness:sprint-12-private-leagues -->
## sprint-12-private-leagues · Sprint 12 - Private Leagues



### Scope aprobado

  - `apps/web/**`
  - `packages/domain/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Liga, membership, invitación y equipo por liga decididos.
- **external_contracts:** Rutas, versión y expectedVersion definidos.
- **edge_cases:** Capacidad, reingreso, owner y concurrencia definidos.
- **ui_states:** Flujos completos y responsive definidos.

<!-- harness:sprint-13-market-transactions -->
## sprint-13-market-transactions · Sprint 13 - Market, Transactions and Release Clauses



### Scope aprobado

  - `apps/web/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

<!-- harness:sprint-14-round-scoring-rankings -->
## sprint-14-round-scoring-rankings · Sprint 14 - Round Scoring and Rankings



### Scope aprobado

  - `apps/web/**`
  - `packages/domain/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Se persisten resultados por equipo, liga, jornada, revisión e inputs versionados; los totales se derivan de jornadas publicadas y conservan trazabilidad.
- **external_contracts:** API versionada para historial, detalle de jornada y rankings global y privado, con revisión, estado, timestamps UTC y paginación estable.
- **edge_cases:** Se cubren DNP a cero, titulares sin score calculable, jornadas aplazadas, equipos creados tarde, empates completos, reintentos y recomputaciones.
- **ui_states:** La UI muestra jornada, acumulado, posición, variación, desglose de cinco titulares y estados vacío, provisional, recalculando, error y offline.

<!-- harness:sprint-14b-live-round-experience -->
## sprint-14b-live-round-experience · Sprint 14b - Live Round Experience



### Scope aprobado

  - `apps/web/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Reutiliza alineaciones, resultados por jornada y boxscores ya versionados; no añade persistencia duplicada.
- **external_contracts:** Se añade un DTO agregado de jornada con estado, quinteto, estadísticas, evolución y navegación.
- **edge_cases:** Cubre falta de equipo, alineación sin congelar, partidos aplazados, DNP, scores pendientes y jornadas históricas.
- **ui_states:** Marcador, timeline de titulares, gráfico accesible, selector de jornada y responsive 320–430 px.

