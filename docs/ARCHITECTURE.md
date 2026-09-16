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

<!-- harness:sprint-15-home-dashboard -->
## sprint-15-home-dashboard · Sprint 15 - Home Dashboard



### Scope aprobado

  - `apps/web/**`
  - `packages/domain/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** No añade persistencia de negocio; compone alineaciones, jornadas, rankings, precios, partidos, transacciones y ligas ya existentes en una proyección de lectura.
- **external_contracts:** Define un único DTO agregado y versionado con procedencia, estado y fecha de actualización por sección.
- **edge_cases:** Cubre usuario sin equipo o liga, plantilla incompleta, cutoff vencido, jornada en directo, resultado pendiente, partido aplazado, ausencia de movimientos y ausencia de actividad.
- **ui_states:** Especifica jerarquía, navegación directa, estados temporales, responsive y accesibilidad conforme a la referencia.

<!-- harness:sprint-14c-user-profile-account -->
## sprint-14c-user-profile-account · Sprint 14c - User Profile and Account



### Scope aprobado

  - `apps/web/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Amplía `UserProfile` con username normalizado y avatar opcional; conserva `displayName`, la identidad externa de Supabase y todas las relaciones fantasy existentes.
- **external_contracts:** Usa Supabase Auth para correo/sesión, Supabase Storage para avatar y servicios internos autorizados para perfil, métricas y ligas.
- **edge_cases:** Define fallback de avatar, registro atómico, alta retrocompatible para usuarios existentes, concurrencia de username, métricas pendientes y separación entre múltiples identidades de equipo.
- **ui_states:** Define avatar persistente, perfil, edición, cuenta básica, listado de ligas, confirmación de logout, responsive, teclado y estados vacíos/error.

<!-- harness:sprint-14d-green-white-design-system -->
## sprint-14d-green-white-design-system · Sprint 14D - Rediseño integral verde y blanco

Fuente visual y decisiones: docs/design/CANASTIO_14D_VISUAL_DIRECTION.md. Spec detallada propuesta: docs/design/SPRINT_14D_SPEC.md. Rediseño de presentación y componentes compartidos; mantiene contratos, datos y permisos. Requiere aprobación explícita antes de implementar.

### Scope aprobado

  - `apps/web/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Sin cambios de persistencia; DTO y reglas existentes.
- **external_contracts:** Sin nuevas APIs; assets locales y autorizados.
- **edge_cases:** Sin liga, perfil incompleto, nombres largos, datos ausentes y cutoff; responsive desde 320 px.
- **ui_states:** Sistema completo en docs/design/CANASTIO_14D_VISUAL_DIRECTION.md y docs/design/SPRINT_14D_SPEC.md.

<!-- harness:sprint-14e-forest-lime-global-reskin -->
## sprint-14e-forest-lime-global-reskin · Sprint 14E - Reskin global bosque y lima

Spec detallada: docs/design/SPRINT_14E_SPEC.md. Sustituye únicamente la dirección cromática clara de 14D; conserva composición, tipografía, densidad, componentes, responsive y contratos funcionales.

### Scope aprobado

  - `apps/web/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

<!-- harness:sprint-14f-production-simulation-suite -->
## sprint-14f-production-simulation-suite · Sprint 14F - Simulación productiva y suite de escenarios SQL

Spec detallada: docs/testing/SPRINT_14F_SPEC.md. Separa foundation, escenarios, transiciones, operaciones reales, assertions, diagnóstico, evidencia y teardown, integrándolos en el ciclo del harness.

### Scope aprobado

  - `seeding/**`
  - `tests/**`
  - `apps/web/src/server/**`
  - `services/fab_ingestor/tests/**`
  - `scripts/**`
  - `prisma/**`
  - `docs/**`
  - `.harness/**`
  - `package.json`
  - `spec.json`

<!-- harness:sprint-14g-fab-credential-resilience -->
## sprint-14g-fab-credential-resilience · Sprint 14G - Resiliencia de credenciales FAB

Originado por el incidente documentado en docs/operations/INCIDENT_2026-09-10_FAB_DEVICE_EXPIRY.md. Spec detallada en spec/sprint-14g-fab-credential-resilience-Sprint 14G - FAB Credential Resilience/.

### Scope aprobado

  - `services/fab_ingestor/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

<!-- harness:sprint-16-pwa-install-and-notifications -->
## sprint-16-pwa-install-and-notifications · Sprint 16 - PWA Install and Notifications

La taxonomía Push contiene once intenciones verificables. No modela lesiones porque FAB no publica partes ni una señal específica; DNP y ausencia no deben convertirse en una inferencia médica. PostgreSQL rechaza nuevas preferencias, entregas y eventos outbox que no pertenezcan a la taxonomía vigente.


### Scope aprobado

  - `apps/web/**`
  - `prisma/**`
  - `packages/domain/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** Añade suscripciones Web Push, preferencias por intención y entregas auditables/deduplicadas, siempre vinculadas al usuario.
- **external_contracts:** Usa estándares Manifest, Service Worker, Push API y Notifications API; el proveedor Web Push queda detrás de un adaptador sustituible.
- **edge_cases:** Cubre varias suscripciones por usuario, rotación de endpoint, logout, revocación del navegador, reinstalación, duplicados de jornada y cutoff vencido.
- **ui_states:** Instalación y notificaciones se gestionan desde Perfil con copy específico por plataforma y sin bloquear la app cuando no hay soporte.

<!-- harness:sprint-17-ingestion-admin -->
## sprint-17-ingestion-admin · Sprint 17 - Ingestion Admin



### Scope aprobado

  - `apps/web/**`
  - `services/fab_ingestor/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

<!-- harness:sprint-18-data-corrections-audit -->
## sprint-18-data-corrections-audit · Sprint 18 - Data Corrections and Audit



### Scope aprobado

  - `apps/web/**`
  - `services/fab_ingestor/**`
  - `packages/domain/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

<!-- harness:sprint-18b-live-game-score-ingestion -->
## sprint-18b-live-game-score-ingestion · Sprint 18B - Live Game Score Ingestion



### Scope aprobado

  - `services/fab_ingestor/**`
  - `apps/web/src/server/**`
  - `apps/web/src/app/**`
  - `packages/domain/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

<!-- harness:sprint-18c-home-contextual-polish -->
## sprint-18c-home-contextual-polish · Sprint 18C - Home Contextual Polish



### Scope aprobado

  - `apps/web/**`
  - `packages/domain/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

<!-- harness:sprint-19-security-privacy-hardening -->
## sprint-19-security-privacy-hardening · Sprint 19 - Security and Privacy Hardening



### Scope aprobado

  - `apps/web/**`
  - `services/fab_ingestor/**`
  - `packages/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

<!-- harness:sprint-20-performance-reliability -->
## sprint-20-performance-reliability · Sprint 20 - Performance and Reliability



### Scope aprobado

  - `apps/web/**`
  - `services/fab_ingestor/**`
  - `prisma/**`
  - `tests/**`
  - `scripts/**`
  - `.github/workflows/**`
  - `.env.example`
  - `docs/**`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** agregados derivados, índices y autoridad definidos.
- **external_contracts:** PostgreSQL de integración y servicios simulados definidos.
- **edge_cases:** carga, invalidación, recomputación e ingestor caído cubiertos.
- **ui_states:** carga, error, revisión vigente y datos en recomputación definidos.

<!-- harness:sprint-21-accessibility-responsive-polish -->
## sprint-21-accessibility-responsive-polish · Sprint 21 - Accessibility and Responsive Polish



### Scope aprobado

  - `apps/web/**`
  - `tests/**`
  - `docs/**`
  - `spec.json`

<!-- harness:sprint-22-beta-observability -->
## sprint-22-beta-observability · Sprint 22 - Beta Observability



### Scope aprobado

  - `apps/web/**`
  - `services/fab_ingestor/**`
  - `prisma/**`
  - `infrastructure/**`
  - `tests/**`
  - `scripts/**`
  - `.github/workflows/**`
  - `.env.example`
  - `docs/**`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** fuentes operativas existentes, feedback separado, agregados y retención acotados.
- **external_contracts:** adaptadores, esquema versionado, sink de test y separación de feedback definidos.
- **edge_cases:** deduplicación, cardinalidad, tormentas, obsolescencia y despliegues cubiertos.
- **ui_states:** contenido, permisos y estados de status y feedback definidos.

<!-- harness:sprint-22b-ingestor-production-deployment -->
## sprint-22b-ingestor-production-deployment · Sprint 22B - Ingestor Production Deployment



### Scope aprobado

  - `infrastructure/**`
  - `services/fab_ingestor/**`
  - `.github/workflows/**`
  - `prisma/migrations/**`
  - `tests/**`
  - `scripts/**`
  - `docs/operations/**`
  - `docs/ARCHITECTURE.md`
  - `docs/CONVENTIONS.md`
  - `docs/DECISIONS.md`
  - `.env.example`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** No requiere un nuevo modelo de dominio: PostgreSQL sigue siendo la fuente de verdad para runs, jobs y heartbeat; locks, revisiones y overrides ya están definidos. Cualquier migración de despliegue debe ser aditiva, ejecutarse como job de release independiente y nunca durante el arranque.
- **external_contracts:** El destino queda fijado en Railway Hobby, región EU West/Amsterdam o la región europea disponible más próxima a PostgreSQL registrada en la ADR. La topología es un único servicio y una sola réplica, sin serverless ni scale-to-zero, con supervisor PID 1, exactamente un scheduler y un worker. Los límites iniciales son 1 vCPU, 512 MiB de RAM, una conexión PostgreSQL persistente por proceso y máximo 4 conexiones totales incluyendo releases. El volumen privado es de 1 GB, con backup diario saneado, retención de 7 días y restauración probada. El coste esperado es 5 USD/mes, con alerta en 7 USD y techo operativo de 12 USD; cambiar plan, región o límites exige actualizar la ADR.
- **edge_cases:** Contempla reinicio durante jobs activos, scheduler duplicado, pérdida temporal de dependencias, jobs RUNNING interrumpidos, renovación atómica de credenciales, repetición idempotente y concurrencia. El supervisor PID 1 garantiza exactamente un scheduler y un worker, propaga SIGTERM y reinicia procesos; la política on-failure admite como máximo 5 reinicios consecutivos antes de alertar.
- **ui_states:** No añade UI funcional; reutiliza el panel administrativo existente, autorizado server-side, que representa HEALTHY, DEGRADED y STALE, backlog, jobs fallidos o bloqueados, latencias y frescura. La vuelta a HEALTHY exige heartbeat reciente, ausencia de jobs bloqueados y error rate/p95 bajo los umbrales del Sprint 22.

<!-- harness:hotfix-partial-round-fantasy-lifecycle -->
## hotfix-partial-round-fantasy-lifecycle · Procesamiento fantasy de jornadas parcialmente sincronizadas

Permitir que el lifecycle calcule puntuaciones, forma y precios para los partidos finalizados con estadísticas válidas aunque otro partido de la misma jornada continúe pendiente por una incidencia de FAB.

### Scope aprobado

  - `apps/web/src/server/fantasy-lifecycle.ts`
  - `apps/web/src/server/fantasy-lifecycle.test.ts`
  - `docs/ARCHITECTURE.md`
  - `docs/DECISIONS.md`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** No requiere migraciones; reutiliza estadísticas, puntuaciones y valores versionados existentes.
- **external_contracts:** Mantiene el contrato HTTP del lifecycle y solo cambia la selección de jornadas elegibles.
- **edge_cases:** Cubre jornadas completas, mixtas y sin ningún partido stats_final.
- **ui_states:** Los jugadores con boxscore final reciben forma y valor; los pendientes conservan su estado anterior.

<!-- harness:sprint-22c-fab-competition-monitoring -->
## sprint-22c-fab-competition-monitoring · Catálogo y monitorización de competiciones FAB

Descubrir periódicamente todas las competiciones publicadas por FAB, conservar su identidad y cambios de metadatos, y mostrar en la consola administrativa el estado detallado de las competiciones elegidas para Canastio.

### Scope aprobado

  - `services/fab_ingestor/**`
  - `apps/web/app/app/admin/ingestion/**`
  - `apps/web/app/api/admin/ingestion/**`
  - `apps/web/src/server/ingestion-admin.ts`
  - `apps/web/src/server/ingestion-admin.test.ts`
  - `apps/web/src/server/ingestion-admin-http.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `tests/**`
  - `docs/operations/**`
  - `docs/ARCHITECTURE.md`
  - `docs/CONVENTIONS.md`
  - `docs/DECISIONS.md`
  - `.env.example`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Catálogo, observaciones, ejecuciones, eventos de cambio y vínculo opcional con competition_seasons mediante migración aditiva.
- **external_contracts:** Enumeración paginada sin filtro nominal, rate limiting y separación entre catálogo ligero e ingesta profunda.
- **edge_cases:** Renombrados, textos duplicados, IDs distintos, páginas repetidas, reanudación y discrepancias entre nombre interno y FAB.
- **ui_states:** Resumen, tarjetas monitorizadas, catálogo filtrable y estados saludables, obsoletos, parciales y fallidos.

<!-- harness:sprint-23-release-candidate -->
## sprint-23-release-candidate · Sprint 23 - Release Candidate



### Scope aprobado

  - `apps/web/app/app/**`
  - `apps/web/app/api/**`
  - `apps/web/src/server/**`
  - `apps/web/src/components/**`
  - `services/fab_ingestor/**`
  - `packages/domain/**`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `tests/**`
  - `docs/operations/**`
  - `docs/testing/**`
  - `docs/ARCHITECTURE.md`
  - `docs/CONVENTIONS.md`
  - `docs/DECISIONS.md`
  - `.github/workflows/**`
  - `.env.example`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** La evidencia canónica reutiliza Game y PlayerGameStat con revisión y hash de origen, FantasyPlayerGameScore único por estadística, ruleset y source_stats_version, y la revisión publicada de RoundTeamScore con las filas de ranking vigentes por liga, jornada e input_revision. No se admite una fuente de verdad paralela; las claves y constraints existentes deben reconciliarse y documentarse, y cualquier constraint faltante solo puede añadirse mediante una migración aditiva y compatible hacia atrás.
- **external_contracts:** El manifiesto fija la 1ª Provincial Senior Masculina de Sevilla 2026/2027 y una jornada publicada mediante IDs FAB reales, sin inferir identidad por nombre. La completitud de calendario exige finalizar el barrido paginado sin PARTIAL ni FAILED y reconciliar todos los partidos esperados; la de boxscore exige una respuesta estructurada válida y stats_final. Una indisponibilidad o cambio incompatible de FAB impide certificar la RC con datos inventados.
- **edge_cases:** Se definen resultados para aplazamientos, finales sin boxscore, boxscores parciales, DNP confirmado, correcciones concurrentes con publicación, doble resync y fallos entre cálculo y publicación. Se preservan nulls, atomicidad, idempotencia, una única revisión vigente y la última publicación completa.
- **ui_states:** Inicio, Jornada, partido, Mi equipo y clasificación distinguen mediante texto los estados vacío, parcial o live, pendiente de estadísticas, calculado no publicado, publicado, corregido, degradado y error. Conservan la última revisión completa, muestran frescura o revisión cuando sea relevante, bloquean acciones inválidas y limitan las acciones administrativas a roles autorizados.

<!-- harness:sprint-24-production-1-0 -->
## sprint-24-production-1-0 · Sprint 24 - Production 1.0



### Scope aprobado

  - `apps/web/**`
  - `services/fab_ingestor/**`
  - `packages/**`
  - `prisma/**`
  - `infrastructure/**`
  - `tests/**`
  - `.github/workflows/**`
  - `.env.example`
  - `docs/**`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Reutiliza el modelo vigente; solo admite cambios aditivos y verifica aislamiento y habilitación de una segunda competition_season.
- **external_contracts:** Exige infraestructura reproducible, contratos de hosting/base de datos y backup restaurable en aislamiento.
- **edge_cases:** Cubre reinicios, concurrencia operativa, credenciales, pool, migraciones, backup/restore y segunda competición.
- **ui_states:** Verifica PWA y panel existentes en estados normales y degradados, sin introducir una feature visual nueva.

<!-- harness:sprint-25-production-push-notifications -->
## sprint-25-production-push-notifications · Configuración productiva de Web Push en Supabase y PWA

Completar la configuración operativa de las notificaciones Web Push ya iniciadas en Sprint 16, conectando Supabase, secretos VAPID, PWA, dispatcher y dispositivos reales de forma segura y observable.

### Scope aprobado

  - `apps/web/app/api/notifications/**`
  - `apps/web/app/app/perfil/**`
  - `apps/web/src/server/notifications.ts`
  - `apps/web/src/server/web-push-sender.ts`
  - `apps/web/src/server/observability/**`
  - `apps/web/public/sw.js`
  - `apps/web/e2e/pwa-notifications.spec.ts`
  - `apps/web/src/**/*.test.ts`
  - `packages/domain/notifications/**`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `tests/**`
  - `infrastructure/**`
  - `.github/workflows/**`
  - `.env.example`
  - `docs/PWA_NOTIFICATIONS.md`
  - `docs/SECURITY_PRIVACY.md`
  - `docs/BETA_OBSERVABILITY_RUNBOOK.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DECISIONS.md`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Se define una extensión aditiva de NotificationDelivery con nextAttemptAt, claimedAt, claimToken y lastAttemptAt; PENDING con claim anterior a 5 minutos es recuperable. La deduplicación autoritativa permanece en (pushSubscriptionId, intent, eventKey). PushSubscription conserva endpoint activo único, propietario inmutable y vapidKeyVersion pública, sin persistir claves privadas.
- **external_contracts:** Quedan definidos el contrato interno v1 de los productores, eventKey determinista, disparo tras commit, job server-side autenticado, ausencia de dispatch público y prueba autenticada por dispositivo con validación de origen/CSRF. Antes de aprobar falta fijar valores concretos del rate limit de la prueba y del job, así como límites operativos del proveedor Web Push —timeout, concurrencia y tamaño máximo aceptado— y su configuración.
- **edge_cases:** Antes del sender se revalidan actividad, propietario y preferencia. Logout revoca solo el dispositivo actual; un cambio de cuenta exige revocación previa y nunca transfiere endpoints activos. La instalación usa un UUID local aleatorio que rota al reinstalar, mientras endpoint y propietario son la identidad server-side autoritativa.
- **ui_states:** Las preferencias por intención son globales y la suscripción es por dispositivo. La fuente visual autoritativa combina soporte, Notification.permission y PushManager.getSubscription(), con transiciones y acciones definidas para no compatible, default, granted sin suscripción, suscrito, denied, error, reintento y recuperación al estado real derivado.

<!-- harness:sprint-26-push-outbox-railway-worker -->
## sprint-26-push-outbox-railway-worker · Entrega automática de notificaciones mediante outbox y Railway

Conectar los eventos de dominio a una outbox transaccional en Supabase y procesarlos desde el worker permanente de Railway, con activación inmediata por webhook y barrido periódico de respaldo.

### Scope aprobado

  - `apps/web/**`
  - `services/fab_ingestor/**`
  - `packages/domain/notifications/**`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `tests/**`
  - `infrastructure/**`
  - `.github/workflows/**`
  - `.env.example`
  - `docs/**`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

<!-- harness:sprint-27-social-league-experience -->
## sprint-27-social-league-experience · Actividad social automática y competitiva dentro de ligas privadas

Convertir cada liga privada en un grupo social vivo mediante acontecimientos verificables del fantasy, reacciones rápidas y narrativas competitivas generadas por Canastio. La experiencia vive en Liga y no incorpora comentarios, publicaciones libres ni una pestaña Comunidad.

### Scope aprobado

  - `apps/web/app/app/ligas/**`
  - `apps/web/app/api/leagues/**`
  - `apps/web/app/api/players/**`
  - `apps/web/src/components/**`
  - `apps/web/src/server/**`
  - `apps/web/public/**`
  - `packages/domain/**`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `supabase/**`
  - `tests/**`
  - `docs/design/FUTURE_LEAGUE_ACTIVITY_SPEC.md`
  - `docs/PRIVATE_LEAGUES.md`
  - `docs/PWA_NOTIFICATIONS.md`
  - `docs/SECURITY_PRIVACY.md`
  - `docs/ARCHITECTURE.md`
  - `docs/CONVENTIONS.md`
  - `docs/DECISIONS.md`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Stream de eventos versionado e idempotente, reacciones de catálogo cerrado, seguimientos, rivalidades y logros derivados de fuentes autoritativas; presencia efímera separada de datos históricos.
- **external_contracts:** Eventos con referencia fuente y payload versionado; cursores opacos, revisiones publicadas, presencia con expiración y avisos deduplicados.
- **edge_cases:** Concurrencia, duplicados, empates, correcciones, eventos fuera de orden, backfill, nombres largos, importes grandes y periodos no comparables cubiertos.
- **ui_states:** Liga contiene Clasificación, Actividad y Miembros; hitos destacados, feed continuo, perfiles, Head-to-Head, directo, seguimientos y tarjetas accesibles desde 320 px.

<!-- harness:sprint-28-manager-profile-rivalries -->
## sprint-28-manager-profile-rivalries · Perfil fantasy completo, palmarés visual y acceso a rivalidades

Completar el perfil social de cada manager dentro de una liga privada siguiendo la referencia visual, con identidad real, palmarés verificable, siete iconos aportados por producto, histórico y acceso contextual a comparativas y rivalidades.

### Scope aprobado

  - `apps/web/app/app/ligas/**`
  - `apps/web/app/api/leagues/**`
  - `apps/web/src/components/**`
  - `apps/web/src/server/**`
  - `apps/web/public/**`
  - `packages/domain/**`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `supabase/**`
  - `tests/**`
  - `docs/PRIVATE_LEAGUES.md`
  - `docs/SECURITY_PRIVACY.md`
  - `docs/ACCESSIBILITY_AND_LOCALE.md`
  - `docs/ARCHITECTURE.md`
  - `docs/CONVENTIONS.md`
  - `docs/DECISIONS.md`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** El perfil, histórico y racha se calculan bajo demanda desde FantasyRoundScore publicado y LeagueAchievementAward. La revisión vigente es la no supersedida de mayor revision para liga, temporada, jornada y equipo; las revisiones anteriores permanecen inmutables y enlazadas mediante supersedesId o el mecanismo vigente equivalente. No se añaden snapshots salvo que un gate de rendimiento lo justifique.
- **external_contracts:** La tarjeta implementa manager-profile-share.v1 con una allowlist explícita. Se genera como PNG 1200x630 image/png, con nombre canastio-perfil-<slug-publico>.png, sin IDs ni URL de liga. El orden de fallback es Web Share con archivo cuando canShare lo admita, descarga PNG y copia de un resumen textual saneado.
- **edge_cases:** La racha v1 cuenta jornadas publicadas consecutivas en las que el equipo termina como líder único o colíder. Un empate en el máximo cuenta como victoria compartida; una puntuación inferior, ausencia de score o hueco en la secuencia corta la racha. Nunca cruza temporadas y las correcciones retroactivas recalculan la secuencia usando exclusivamente revisiones vigentes.
- **ui_states:** La URL canónica es /app/ligas/{leagueId}/managers/{publicManagerId}. El retorno usa returnTo restringido a rutas relativas allowlisted de la misma liga y un token local no sensible para restaurar pestaña, filtros, cursor, scroll y foco. Si falta, caduca o es inválido, la navegación vuelve a /app/ligas/{leagueId}?tab=members. Nunca se aceptan destinos absolutos aportados por el cliente.

<!-- harness:sprint-29-monitored-competition-team-index -->
## sprint-29-monitored-competition-team-index · Índice de equipos y jugadores en competiciones monitorizadas

Extender las tarjetas de competiciones monitorizadas de Administrar ingesta con un índice consultable de sus equipos y el número de jugadores inscritos en cada uno, acompañado de totales, frescura y estados que distingan datos completos, parciales, todavía no sincronizados y fallidos.

### Scope aprobado

  - `apps/web/app/app/admin/ingestion/**`
  - `apps/web/app/api/admin/ingestion/**`
  - `apps/web/src/server/ingestion-admin.ts`
  - `apps/web/src/server/ingestion-admin.test.ts`
  - `apps/web/src/server/ingestion-admin-http.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `tests/**`
  - `docs/INGESTION_ADMIN.md`
  - `docs/operations/FAB_COMPETITION_MONITORING_SPEC.md`
  - `docs/ARCHITECTURE.md`
  - `docs/CONVENTIONS.md`
  - `docs/DECISIONS.md`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Los equipos e inscripciones se agregan desde TeamRegistration y PlayerRegistration de la CompetitionSeason; los conteos representan inscripciones, no personas globalmente únicas.
- **external_contracts:** Se especifican campos, nullabilidad, timestamps UTC y semántica de los totales y filas del resumen administrativo.
- **edge_cases:** Se fijan equipos homónimos, inscripciones multitemporada, aislamiento entre competiciones, orden estable y snapshots parciales o fallidos.
- **ui_states:** El índice es desplegable y accesible, con carga, vacío, advertencia, error, reintento y comportamiento responsive definidos.

<!-- harness:sprint-30-railway-immediate-startup-sync -->
## sprint-30-railway-immediate-startup-sync · Sincronización inmediata tras desplegar en Railway

Formalizar y verificar que cada arranque del servicio productivo de Railway ejecuta inmediatamente un ciclo completo de ingesta antes de entrar en la espera periódica, sin crear un segundo scheduler ni saltarse las protecciones de idempotencia y exclusión existentes.

### Scope aprobado

  - `services/fab_ingestor/fab_ingestor/orchestrator.py`
  - `services/fab_ingestor/fab_ingestor/production.py`
  - `services/fab_ingestor/fab_ingestor/main.py`
  - `services/fab_ingestor/tests/**`
  - `infrastructure/railway/**`
  - `docs/operations/INGESTOR_PRODUCTION_DEPLOYMENT_SPEC.md`
  - `docs/operations/RAILWAY_RUNBOOK.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DECISIONS.md`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

<!-- harness:sprint-31-catalog-link-and-retired-games -->
## sprint-31-catalog-link-and-retired-games · Recuperación de datos monitorizados y partidos retirados



### Scope aprobado

  - `services/fab_ingestor/**`
  - `apps/web/src/server/ingestion-admin.ts`
  - `apps/web/src/server/ingestion-admin.test.ts`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `docs/operations/**`
  - `docs/ARCHITECTURE.md`
  - `docs/DECISIONS.md`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

<!-- harness:sprint-32-controlled-rollout-preview -->
## sprint-32-controlled-rollout-preview · Preview de registro y ligas con acceso interno controlado

Introducir un gate de rollout administrable que, mientras esté activo, permita al público registrarse, iniciar sesión y crear o unirse a una liga como preview, pero bloquee el resto del producto. Los perfiles `pvto_pepe` y `fvcking_pepe` conservan acceso integral para pruebas internas. Un administrador puede activar o desactivar el gate en tiempo de ejecución de forma segura y auditable.

### Scope aprobado

  - `apps/web/middleware.ts`
  - `apps/web/app/auth/**`
  - `apps/web/app/app/**`
  - `apps/web/app/api/**`
  - `apps/web/src/app/api/**`
  - `apps/web/src/components/**`
  - `apps/web/src/lib/supabase/**`
  - `apps/web/src/server/**`
  - `prisma/schema.prisma`
  - `prisma/migrations/**`
  - `supabase/**`
  - `tests/**`
  - `docs/SECURITY_PRIVACY.md`
  - `docs/PRIVATE_LEAGUES.md`
  - `docs/ARCHITECTURE.md`
  - `docs/CONVENTIONS.md`
  - `docs/DECISIONS.md`
  - `spec/**`
  - `progress/**`
  - `.harness/**`
  - `spec.json`

### Contexto técnico

- **data_model:** Configuración única PREVIEW/OPEN, versionada y auditable; bypass fijo por username canónico exacto.
- **external_contracts:** Se preservan Auth y ligas; contrato administrativo versionado sin nueva integración externa.
- **edge_cases:** Membresía sin bypass, coincidencias exactas, admin mínimo, rutas profundas, sesiones y concurrencia.
- **ui_states:** Preview dedicada, confirmaciones y estados accesibles; OPEN conserva la experiencia actual.

