# Decisiones (ADR)

Formato por entrada: **fecha · título** — contexto, decisión y consecuencias.
El harness añade entradas cuando se aprueba un spec; el agente también debe añadir entradas cuando toma
una decisión de arquitectura relevante durante implementación.

## Pendientes de decisión

- (rellenar) Decisiones que aún no deben asumirse automáticamente.

<!-- Nuevas entradas debajo -->

## 2026-09-14 · Scope de dependencias de Sprint 23

Contexto: la auditoría de la release candidate detectó vulnerabilidades HIGH transitivas en PostCSS y deepmerge-ts, pero los manifests y el lockfile no estaban incluidos en el scope inicial.

Decisión: el responsable del proyecto autoriza ampliar Sprint 23 a `package.json`, `apps/web/package.json` y `pnpm-lock.yaml` exclusivamente para aplicar las actualizaciones mínimas compatibles necesarias para que el gate de dependencias pase.

Consecuencia: cualquier salto mayor o cambio funcional ajeno a la remediación requiere una decisión separada; typecheck, lint, tests y auditoría deben repetirse tras regenerar el lockfile.

## 2026-09-12 · Perfil como hub de configuración

Contexto: Perfil acumulaba identidad, preferencias, notificaciones, seguridad y privacidad en un único scroll móvil de más de seis viewports.

Decisión: `/app/perfil` conserva identidad, ligas y filas de acceso; las tareas de configuración se separan por subrutas. Los formularios transaccionales tienen una pantalla dedicada y la eliminación requiere confirmación modal con username no precargado.

Consecuencia: la navegación inferior mantiene sus cinco destinos y las nuevas opciones de cuenta se incorporan como subrutas, no como destinos globales ni bloques permanentes en Perfil.

## 2026-09-12 · Perfil como hub de ajustes

Contexto: Perfil acumulaba identidad, preferencias, notificaciones, seguridad, sesiones, privacidad y eliminación en un único scroll móvil.

Decisión: mantener `/app/perfil` como hub breve y distribuir los ajustes en subrutas por responsabilidad, sin añadir destinos a la navegación principal. Las operaciones sensibles se aíslan y la eliminación conserva una confirmación final adicional.

Consecuencia: las nuevas opciones de cuenta deben incorporarse a la subruta correspondiente y no alargar el hub principal.

## 2026-09-12 · Tema previo al pintado y configuración regional única

Contexto: la PWA necesita tema Sistema/Claro/Oscuro sin destello de hidratación y formatos coherentes mientras solo existe la interfaz española.

Decisión: validar `canastio-theme` y resolver Sistema contra `prefers-color-scheme` mediante un script inline síncrono en el `head`; los tokens se seleccionan con `data-theme`. La configuración efectiva se centraliza como `es-ES` y `Europe/Madrid` en `apps/web/src/lib/preferences.ts`.

Consecuencia: valores inválidos o almacenamiento inaccesible degradan a Sistema, y las nuevas superficies deben reutilizar el contrato regional en vez de inferirlo del navegador.

## 2026-09-11 · El marcador live y el boxscore individual progresan de forma independiente

Contexto: FAB publicó un tanteo 21-24 y después 38-34 desde `estadisticas.ashx` mientras `buscarPartido` seguía en `-/-`; durante ese intervalo el array de jugadores permaneció vacío.

Decisión: reconciliar estado, marcador y parciales independientemente de las filas individuales. Los jugadores presentes se guardan como snapshot parcial sin borrar ausencias ni validar sumas hasta el cierre. Los scores de jornada pueden ser provisionales, pero rankings publicados y precios solo avanzan con toda la cohorte en `stats_final`.

Consecuencia: la aplicación degrada a marcador en vivo cuando FAB no ofrece boxscore, conserva nulls honestos y evita presentar datos incompletos como definitivos.

## 2026-09-06 · Las ligas privadas preceden al mercado entre usuarios

Contexto: los clausulazos solo tienen sentido dentro de un ámbito competitivo compartido y necesitan identificar propietario, comprador, límites y jornada de una liga concreta.

Decisión: intercambiar los antiguos Sprints 12 y 13. El Sprint 12 crea ligas privadas y memberships; el Sprint 13 implementa mercado, transacciones y clausulazos. El Sprint 11 prepara el modelo económico de cláusulas sin ejecutar transferencias entre usuarios.

Consecuencia: rankings dependen del nuevo `sprint-12-private-leagues`; home depende del nuevo `sprint-13-market-transactions`. Los specs de los Sprints 11–13 siguen pendientes de entrevista y aprobación antes de implementar.

<!-- harness:sprint-0-project-foundation -->
## 2026-09-04 · sprint-0-project-foundation aprobado

Contexto: se aprobó el spec `sprint-0-project-foundation` (Sprint 0 - Project Foundation).

Decisiones registradas:

- **auth_secrets:** FAB_DEVICE, FAB_KEY, SECRET, PASSWORD y TOKEN son siempre server-side; ninguna variable sensible usa NEXT_PUBLIC_.
- **rollback_compat:** La migración inicial es vacía y la estructura permite continuar sin autenticación, fantasy ni mercado.
- **tests:** Se cubren los comandos de TypeScript, lint, tests, pytest y validación Prisma definidos por el spec.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

## 2026-09-15 · Web Push usa invalidación VAPID explícita y claims con lease

Se adopta una única versión VAPID activa. Cambiar `VAPID_KEY_VERSION` deja las suscripciones anteriores fuera del dispatcher y exige resincronización iniciada por el usuario desde Perfil; no existe ventana dual ni se persisten claves privadas históricas. Las entregas se deduplican por suscripción, intención y evento, se reclaman durante 5 minutos y se revalidan antes de enviar.

Consecuencia: la rotación es visible y recuperable, el rollback restaura de forma conjunta versión y secretos desde el gestor, y dos dispatchers no envían simultáneamente la misma clave.

<!-- implementation:sprint-24-production-1-0 -->
## 2026-09-15 · Contrato operativo de producción 1.0

Decisión: `infrastructure/production.json` es el manifiesto versionado del entorno y `docs/operations/PRODUCTION_1_0_RUNBOOK.md` su índice operativo autoritativo. La release se separa en gates, migración y promoción por digest; los backups diarios se cifran antes de abandonar el runner y cualquier restore se rechaza salvo destino explícitamente aislado. El scheduler permanece singleton y PostgreSQL conserva cola, auditoría y publicaciones durante rollback.

Consecuencia: cambiar origen, proveedor, región, responsables, política de backup, topología o versiones congeladas requiere actualizar el manifiesto, este ADR y las pruebas antes de promover otro release.

## 2026-09-14 · ADR-002 alojamiento productivo del ingestor

Se aprueba Railway Hobby en región EU West, una réplica permanente de 1 vCPU/512 MiB con supervisor PID 1, volumen privado de 1 GiB y despliegue OCI por digest. El presupuesto de conexiones es 2 persistentes + 1 release + 1 reserva (máximo 4); migraciones se ejecutan como release job y el rollback no revierte datos. Detalle y alternativas en `docs/operations/ADR-002-INGESTOR-PRODUCTION-HOSTING.md`.

## 2026-09-14 · Observabilidad beta independiente de proveedor

La telemetría usa `canastio.observability.v1`, redacción y allowlist antes del sink, agrupación por componente/operación/categoría/release y adaptadores best-effort. El feedback se persiste en `user_feedback`, separado de señales técnicas. Los tres canales tienen flags server-side independientes y la retirada del sink no requiere cambios destructivos.

## 2026-09-06 · Revisiones inmutables de alineación y cutoff autoritativo

Contexto: Sprint 10 exige permitir guardados antes del cierre y conservar snapshots aunque cambien plantilla, precios, jugadores o calendario.

Decisión: cada guardado crea una revisión de `fantasy_lineups` con slots snapshot inmutables; la anterior solo se marca como sustituida. La revisión vigente se serializa por equipo y jornada, captura el primer `scheduled_at` persistido como cutoff, exige `source_timezone`, bloquea los partidos y compara inclusivamente con `clock_timestamp()` dentro de una transacción serializable. El primer GET posterior materializa `LOCKED` sin recalcular el cutoff capturado.

Consecuencia: el histórico sobrevive a cambios posteriores, no hay dos revisiones vigentes concurrentes y el reloj cliente nunca decide el cierre.

## 2026-09-05 · Snapshot y unidad transaccional del scoring fantasy

Contexto: el spec fija determinismo e histórico, pero requiere concretar el límite de recomputación y la representación fuente.

Decisión: `player-game-stat.v1` usa JSON canónico con orden fijo y decimales como texto; su SHA-256 es `source_stats_version`. La unidad atómica de recomputación es una jornada de una `competitionSeason` y un ruleset explícito, con aislamiento serializable, retry de conflictos y unicidad por inputs. El indicador `recalculated` es metadato de presentación y no reemplaza el estado de cálculo persistido.

Consecuencia: no hay publicación parcial de una jornada; correcciones y nuevas versiones crean filas aditivas y el cliente siempre solicita una versión concreta.

## 2026-09-05 · Canastio adopta diseño mobile-first

Contexto: la portada y las superficies deportivas deben funcionar primero en teléfonos de 360–430 px; en el viewport iPhone XR el titular, el logo ambiental y el CTA competían por espacio.

Decisión: usar `100svh`, escala tipográfica acotada, gutters de 16–20 px, targets táctiles mínimos de 44 px y safe areas. En tablas se ocultan datos secundarios en móvil; solo el boxscore conserva desplazamiento horizontal. La navegación inferior queda limitada a cinco destinos prioritarios.

Consecuencia: cada sprint con UI debe verificar 320, 360, 390 y 430 px, además de desktop, y no puede aceptar recortes horizontales ni acciones críticas fuera del primer viewport.

## 2026-09-05 · API pública de lectura deportiva

Contexto: Sprint 8 necesita servir datos deportivos sin acoplar la PWA al ingestor ni a Afición FAB.

Decisión: los Server Components y Route Handlers comparten una capa `src/server/sports.ts` basada en Prisma. Las lecturas públicas se cachean durante 60 segundos, los listados usan páginas fijas de 20 elementos y los agregados de jugador se calculan desde `PlayerGameStat`.

Consecuencia: la API nunca consulta FAB ni expone `RawFabPayload`; una ausencia de estadísticas se representa explícitamente y no como ceros inventados.

<!-- harness:sprint-1-fab-client -->
## 2026-09-04 · sprint-1-fab-client aprobado

Contexto: se aprobó el spec `sprint-1-fab-client` (Sprint 1 - FAB Client).

Decisiones registradas:

- **auth_secrets:** id_dispositivo y key nunca se registran, incluyen en excepciones ni se exponen mediante variables públicas.
- **rollback_compat:** El cliente queda aislado detrás de FabClient y no modifica el modelo deportivo ni introduce llamadas FAB desde la PWA.
- **tests:** Fixtures anonimizadas y transporte simulado cubren registro, rotación, paginación, timeout, reintentos y errores sin red real.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-2-sports-data-model -->
## 2026-09-04 · sprint-2-sports-data-model aprobado

Contexto: se aprobó el spec `sprint-2-sports-data-model` (Sprint 2 - Sports Data Model).

Decisiones registradas:

- **auth_secrets:** `raw_fab_payloads.payload` se sanea antes de persistir y rechaza claves sensibles (`key`, `id_dispositivo`, token, password, secret); la base no almacena credenciales FAB en tablas deportivas.
- **rollback_compat:** La migración solo añade tablas deportivas, es reversible en desarrollo y no modifica el contrato del `FabClient` ni introduce tablas fantasy.
- **tests:** Se prueban esquema, constraints y UPSERT con PostgreSQL real de test; además hay tests unitarios de saneado y mapeo. `prisma validate`, Python y gates existentes deben pasar.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-3-active-competition-discovery -->
## 2026-09-04 · sprint-3-active-competition-discovery aprobado

Contexto: se aprobó el spec `sprint-3-active-competition-discovery` (Sprint 3 - Active Competition Discovery).

Decisiones registradas:

- **auth_secrets:** Todas las llamadas pasan por FabClient y FileCredentialStore; CLI y logs muestran solo IDs deportivos y nombres, nunca credenciales; RAW se sanea con el contrato del Sprint 2.
- **rollback_compat:** Cambiar la competición primaria requiere transacción; un fallo conserva la anterior. La migración solo añade metadatos/constraint de selección y puede revertirse en desarrollo.
- **tests:** Fixtures anonimizadas cubren discovery, selección, cero resultados, ambigüedad, repetición, RAW y bloqueo contractual; integración PostgreSQL verifica unicidad primaria y rollback.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-4-schedule-and-games-ingestion -->
## 2026-09-04 · sprint-4-schedule-and-games-ingestion aprobado

Contexto: se aprobó el spec `sprint-4-schedule-and-games-ingestion` (Sprint 4 - Schedule and Games Ingestion).

Decisiones registradas:

- **auth_secrets:** Todas las llamadas pasan por FabClient/FileCredentialStore y RawFabPayload elimina credenciales; CLI solo informa conteos e IDs deportivos.
- **rollback_compat:** Cada sincronización normalizada es transaccional; no borra Game ni RAW histórico. La migración aditiva de estado de sincronización tiene rollback de desarrollo.
- **tests:** Fixtures anonimizadas y tests cubren contrato, mapeo, alta, reprogramación, resultado, duplicados, stale y rollback; integración usa PostgreSQL real y las pruebas normales no llaman a FAB.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-5-boxscore-ingestion -->
## 2026-09-05 · sprint-5-boxscore-ingestion aprobado

Contexto: se aprobó el spec `sprint-5-boxscore-ingestion` (Sprint 5 - Boxscore Ingestion).

Decisiones registradas:

- **auth_secrets:** El endpoint solo se consume desde FabClient con credenciales server-side; RAW y logs se sanean.
- **rollback_compat:** La escritura de jugadores, inscripciones, estadísticas y estado del partido es transaccional; migraciones únicamente aditivas.
- **tests:** Fixtures anonimizadas y tests cubren mapping, nullability, identidad provisional/estable, correcciones, duplicados, contradicciones y rollback PostgreSQL.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-6-ingestion-orchestrator -->
## 2026-09-05 · sprint-6-ingestion-orchestrator aprobado

Contexto: se aprobó el spec `sprint-6-ingestion-orchestrator` (Sprint 6 - Ingestion Orchestrator).

Decisiones registradas:

- **auth_secrets:** El worker usa exclusivamente configuración server-side y solo emite códigos de error y contadores saneados.
- **rollback_compat:** Migración aditiva; jobs transaccionales por fase; advisory locks transaccionales compatibles con el pool de Supabase y cierre controlado ante SIGINT/SIGTERM.
- **tests:** Reloj y sleeper inyectables; tests sin esperas reales para calendario, locks, retries, circuit breaker y shutdown; PostgreSQL valida exclusión mutua y runs.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-7-pwa-auth-shell -->
## 2026-09-05 · sprint-7-pwa-auth-shell aprobado

Contexto: se aprobó el spec `sprint-7-pwa-auth-shell` (Sprint 7 - PWA Auth and Shell).

Decisiones registradas:

- **auth_secrets:** Cookies seguras y validación server-side; service-role key y secretos FAB exclusivamente en servidor.
- **rollback_compat:** Migración aditiva para el perfil; desactivar auth no altera las tablas deportivas existentes.
- **tests:** Tests unitarios y de integración para middleware, callbacks, formularios, sesión, protección de rutas y manifest/service worker.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-8-sports-explorer -->
## 2026-09-05 · sprint-8-sports-explorer aprobado

Contexto: se aprobó el spec `sprint-8-sports-explorer` (Sprint 8 - Sports Explorer).

Decisiones registradas:

- **auth_secrets:** Las lecturas deportivas pasan por la API propia; no se exponen credenciales, payloads RAW ni llamadas directas a Afición FAB.
- **rollback_compat:** Es una capa de lectura y presentación sobre el esquema existente; cualquier cambio de Prisma debe ser aditivo y reversible.
- **tests:** E2E cubre calendario, partido con estadísticas, partido sin estadísticas y ficha de jugador; las consultas y agregados se prueban sin red FAB.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-9-fantasy-scoring-engine -->
## 2026-09-05 · sprint-9-fantasy-scoring-engine aprobado

Contexto: se aprobó el spec `sprint-9-fantasy-scoring-engine` (Sprint 9 - Fantasy Scoring Engine).

Decisiones registradas:

- **auth_secrets:** El motor se ejecuta exclusivamente en servidor sobre estadísticas persistidas, no necesita credenciales FAB nuevas y no expone credenciales ni RawFabPayload en API, breakdown, errores o logs.
- **rollback_compat:** Los rulesets publicados son inmutables y solo puede existir uno activo por competitionSeason y tipo de cálculo. La activación y reactivación son transaccionales y auditables. Retirar una versión la marca RETIRED sin borrar reglas ni resultados. Las correcciones de datos y los cambios de versión generan resultados separados por source_stats_version y ruleset, preservando el histórico.
- **tests:** Los casos dorados v1 quedan decidibles. Provincial: PTS=20, 3PM=2, FTM=4 y FC=3 produce raw=20.5. Nacional: PTS=20, REB=8, AST=5, STL=2, BLK=1, TO=3, FGM=7, FGA=15, FTM=4, FTA=6 y FC=3 produce raw=35.1. Con media=20 y desviación=10, raw=20.5 produce 20.5 FP; con media=25 y desviación=10, raw=35.1 produce 30.1 FP. Z≤-2 produce 0 FP y Z≥3 produce 50 FP. DNP produce 0 FP y no entra en la muestra. Una población de 19 o desviación cero produce PENDING/INSUFFICIENT_NORMALIZATION_SAMPLE con FP null; un null requerido produce NOT_CALCULABLE/MISSING_REQUIRED_STAT con ambos scores null. Las fronteras half-up incluyen 20.04→20.0 y 20.05→20.1. Se cubren además raw negativos, empates, null opcional, ausencia de bonus en v1 y actuaciones equivalentes entre ligas. Tests puros verifican determinismo, orden y serialización canónicos, SHA-256 y breakdown; PostgreSQL verifica constraints, idempotencia, concurrencia, rollback e histórico entre versiones. Los tests no dependen de la red FAB.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-10-fantasy-team-roster -->
## 2026-09-05 · sprint-10-fantasy-team-roster aprobado

Contexto: se aprobó el spec `sprint-10-fantasy-team-roster` (Sprint 10 - Fantasy Team and Roster).

Decisiones registradas:

- **auth_secrets:** El actor procede exclusivamente de la sesión server-side. Solo el propietario puede modificar y, hasta Sprint 13, leer. La futura lectura compartida dependerá de una política server-side de liga privada. Inexistencia y acceso no autorizado son indistinguibles mediante 404 TEAM_NOT_FOUND. No se introducen secretos nuevos.
- **rollback_compat:** Las migraciones y contratos son aditivos; roster y snapshots históricos se conservan indefinidamente. Un flag server-side desactiva las mutaciones con 409 FEATURE_DISABLED mientras los GET históricos siguen disponibles con 200 en solo lectura, sin borrar datos ni alterar contratos deportivos, de autenticación o scoring.
- **tests:** Se requieren pruebas con PostgreSQL real y concurrencia. Se cubren roster de 7, distribución 5+2, ausencia de posiciones, máximo de 2 jugadores por equipo real, presupuesto exacto de 100000000 créditos y exceso por 1, precio cold-start de 3000000, captura inmutable del acquisition_price, PRICE_UNAVAILABLE en modo dinámico, autorización, reprogramaciones, conflictos de versión, snapshots inmutables, contratos de respuesta y la garantía de que ninguna escritura cuyo clock_timestamp() efectivo sea igual o posterior al cutoff confirma.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-11-player-pricing -->
## 2026-09-06 · sprint-11-player-pricing aprobado

Contexto: se aprobó el spec `sprint-11-player-pricing` (Sprint 11 - Player Pricing).

Decisiones registradas:

- **auth_secrets:** Cálculo exclusivamente server-side sin secretos nuevos.
- **rollback_compat:** Datos aditivos y fallback cold-start.
- **tests:** Cobertura pura, PostgreSQL y UI/API.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-12-private-leagues -->
## 2026-09-06 · sprint-12-private-leagues aprobado

Contexto: se aprobó el spec `sprint-12-private-leagues` (Sprint 12 - Private Leagues).

Decisiones registradas:

- **auth_secrets:** Actor server-side y tokens hasheados.
- **rollback_compat:** Equipos existentes migran a ligas personales.
- **tests:** Dominio, PostgreSQL y E2E definidos.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-13-market-transactions -->
## 2026-09-06 · sprint-13-market-transactions aprobado

Contexto: se aprobó el spec `sprint-13-market-transactions` (Sprint 13 - Market, Transactions and Release Clauses).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-14-round-scoring-rankings -->
## 2026-09-06 · sprint-14-round-scoring-rankings aprobado

Contexto: se aprobó el spec `sprint-14-round-scoring-rankings` (Sprint 14 - Round Scoring and Rankings).

Decisiones registradas:

- **auth_secrets:** La identidad y pertenencia a liga se resuelven server-side; los rankings privados solo son visibles para miembros y no aceptan userId como actor.
- **rollback_compat:** Migración aditiva y feature flag server-side; desactivar mutaciones conserva lecturas de resultados ya publicados.
- **tests:** Dominio, PostgreSQL, contratos API y E2E cubren cálculo, idempotencia, recomputación, permisos, desempates y estados de UI.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-14b-live-round-experience -->
## 2026-09-07 · sprint-14b-live-round-experience aprobado

Contexto: se aprobó el spec `sprint-14b-live-round-experience` (Sprint 14b - Live Round Experience).

Decisiones registradas:

- **auth_secrets:** La identidad procede de sesión y solo consulta el equipo del usuario y ligas autorizadas.
- **rollback_compat:** Ruta y componentes aditivos; la pestaña conserva un estado vacío si se desactiva el cálculo.
- **tests:** Contrato, transformación de datos, estados y responsive quedan cubiertos sin FAB real.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-15-home-dashboard -->
## 2026-09-07 · sprint-15-home-dashboard aprobado

Contexto: se aprobó el spec `sprint-15-home-dashboard` (Sprint 15 - Home Dashboard).

Decisiones registradas:

- **auth_secrets:** La identidad se obtiene de la sesión y cada bloque respeta pertenencia y visibilidad de liga; no acepta un `userId` arbitrario del cliente.
- **rollback_compat:** La portada es una composición aditiva sobre fuentes existentes; puede volver al inicio anterior sin migraciones destructivas.
- **tests:** Se cubren agregación, autorización, prioridades, estados, navegación y responsive sin depender de FAB real.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-14c-user-profile-account -->
## 2026-09-07 · sprint-14c-user-profile-account aprobado

Contexto: se aprobó el spec `sprint-14c-user-profile-account` (Sprint 14c - User Profile and Account).

Decisiones registradas:

- **auth_secrets:** La sesión determina siempre el perfil; el correo procede de Supabase Auth y no se publica en ligas; ninguna contraseña, token o identificador arbitrario del cliente se persiste o registra.
- **rollback_compat:** La migración es aditiva, mantiene perfiles y equipos existentes y permite retirar la UI sin romper autenticación ni relaciones fantasy.
- **tests:** Incluye esquema, autorización, colisiones concurrentes, avatar, resumen, ligas, logout, navegación y viewport móvil.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-14d-green-white-design-system -->
## 2026-09-07 · sprint-14d-green-white-design-system aprobado

Contexto: se aprobó el spec `sprint-14d-green-white-design-system` (Sprint 14D - Rediseño integral verde y blanco).

Decisiones registradas:

- **auth_secrets:** Sesión y permisos existentes; ningún secreto en capturas.
- **rollback_compat:** Cambio visual reversible sin migraciones.
- **tests:** Checks, smoke tests y capturas revisadas en cinco anchos, foco, contraste y reduced motion.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-14e-forest-lime-global-reskin -->
## 2026-09-08 · sprint-14e-forest-lime-global-reskin aprobado

Contexto: se aprobó el spec `sprint-14e-forest-lime-global-reskin` (Sprint 14E - Reskin global bosque y lima).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-14f-production-simulation-suite -->
## 2026-09-09 · sprint-14f-production-simulation-suite aprobado

Contexto: se aprobó el spec `sprint-14f-production-simulation-suite` (Sprint 14F - Simulación productiva y suite de escenarios SQL).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-14g-fab-credential-resilience -->
## 2026-09-10 · sprint-14g-fab-credential-resilience aprobado

Contexto: se aprobó el spec `sprint-14g-fab-credential-resilience` (Sprint 14G - Resiliencia de credenciales FAB).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-16-pwa-install-and-notifications -->
## 2026-09-10 · sprint-16-pwa-install-and-notifications aprobado

Contexto: se aprobó el spec `sprint-16-pwa-install-and-notifications` (Sprint 16 - PWA Install and Notifications).

Decisiones registradas:

- **auth_secrets:** VAPID private key y cualquier secreto viven exclusivamente en servidor; endpoints de usuario derivan identidad de la sesión.
- **rollback_compat:** Migraciones aditivas; retirar Push no afecta autenticación, shell, mercado ni datos deportivos.
- **tests:** Contratos de manifest/SW, autorización, preferencias, deduplicación, expiración, cutoff, payload y estados UI se prueban sin enviar Push real.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-17-ingestion-admin -->
## 2026-09-11 · sprint-17-ingestion-admin aprobado

Contexto: se aprobó el spec `sprint-17-ingestion-admin` (Sprint 17 - Ingestion Admin).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-18-data-corrections-audit -->
## 2026-09-11 · sprint-18-data-corrections-audit aprobado

Contexto: se aprobó el spec `sprint-18-data-corrections-audit` (Sprint 18 - Data Corrections and Audit).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-18b-live-game-score-ingestion -->
## 2026-09-11 · sprint-18b-live-game-score-ingestion aprobado

Contexto: se aprobó el spec `sprint-18b-live-game-score-ingestion` (Sprint 18B - Live Game Score Ingestion).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-18c-home-contextual-polish -->
## 2026-09-12 · sprint-18c-home-contextual-polish aprobado

Contexto: se aprobó el spec `sprint-18c-home-contextual-polish` (Sprint 18C - Home Contextual Polish).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-19-security-privacy-hardening -->
## 2026-09-12 · sprint-19-security-privacy-hardening aprobado

Contexto: se aprobó el spec `sprint-19-security-privacy-hardening` (Sprint 19 - Security and Privacy Hardening).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-20-performance-reliability -->
## 2026-09-12 · Caché de lecturas e invalidación de Sprint 20

Las lecturas privadas de home, mercado y ranking usan una caché server-side prescindible y de corta duración. Sus claves contienen hashes no reversibles del actor y la liga resueltos por autorización, más revisión y variante; nunca datos de sesión ni PII. Las mutaciones invalidan por etiquetas de liga/jornada únicamente después del commit. La publicación continúa siendo una transacción serializable y los rankings persistidos siguen siendo la autoridad.

Consecuencia: `CANASTIO_SERVER_CACHE_ENABLED=false` restaura lecturas directas sin cambiar datos ni contrato. Cualquier caché distribuida futura deberá conservar la misma composición, invalidación posterior al commit y métricas de cardinalidad acotada.

<!-- harness:sprint-20-performance-reliability -->
## 2026-09-12 · sprint-20-performance-reliability aprobado

Contexto: se aprobó el spec `sprint-20-performance-reliability` (Sprint 20 - Performance and Reliability).

Decisiones registradas:

- **auth_secrets:** aislamiento de caché y métricas saneadas definidos.
- **rollback_compat:** cambios aditivos y bypass de caché definidos.
- **tests:** dataset, concurrencia y umbrales exactos definidos.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-21-accessibility-responsive-polish -->
## 2026-09-12 · sprint-21-accessibility-responsive-polish aprobado

Contexto: se aprobó el spec `sprint-21-accessibility-responsive-polish` (Sprint 21 - Accessibility and Responsive Polish).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-22-beta-observability -->
## 2026-09-13 · sprint-22-beta-observability aprobado

Contexto: se aprobó el spec `sprint-22-beta-observability` (Sprint 22 - Beta Observability).

Decisiones registradas:

- **auth_secrets:** allowlist, redacción previa, permisos y datos prohibidos definidos.
- **rollback_compat:** flags independientes, no-op, cambios aditivos y runbook definidos.
- **tests:** inyecciones, umbrales, duración y verificaciones reproducibles definidos.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-22b-ingestor-production-deployment -->
## 2026-09-13 · sprint-22b-ingestor-production-deployment aprobado

Contexto: se aprobó el spec `sprint-22b-ingestor-production-deployment` (Sprint 22B - Ingestor Production Deployment).

Decisiones registradas:

- **auth_secrets:** Define secretos externos, volumen privado escribible, TLS, secreto compartido con Vercel, rechazo seguro, rotación y prohibición de secretos en imagen, repositorio, argumentos, logs, métricas, panel y CI. FAB_CREDENTIALS_FILE reside en un volumen privado de 1 GB y sus backups diarios saneados se retienen 7 días.
- **rollback_compat:** El rollback restaura el digest anterior conservando PostgreSQL, cola y volumen; prohíbe migraciones destructivas y prescribe diagnóstico auditado para jobs RUNNING interrumpidos. La política on-failure se limita a 5 reinicios consecutivos y después alerta, evitando reinicios indefinidos que oculten una release defectuosa.
- **tests:** El smoke real queda limitado a la 1ª Provincial Senior Masculina de Sevilla 2026/2027, una jornada publicada y como máximo tres partidos representativos, sin tráfico inventado. La observación empieza 60 minutos antes del primer partido y termina al validar el último, con máximo de 6 horas. Se exige heartbeat menor de 10 minutos, claim de un job elegible en menos de 2 minutos, SIGTERM completado en 10 segundos, cero duplicados tras repetición y recuperación HEALTHY dentro de 10 minutos desde restaurar una dependencia. La cadencia verificable es 120 minutos sin partidos próximos, 5 minutos desde 60 minutos antes, 30–60 segundos durante juego y reintentos del boxscore final a 2/5/10/20 minutos; tras validar todos los finales vuelve a 120 minutos. La evidencia saneada se conserva en progress/deployment/sprint-22b/<fecha>-<commit>/.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:hotfix-partial-round-fantasy-lifecycle -->
## 2026-09-14 · hotfix-partial-round-fantasy-lifecycle aprobado

Contexto: se aprobó el spec `hotfix-partial-round-fantasy-lifecycle` (Procesamiento fantasy de jornadas parcialmente sincronizadas).

Decisiones registradas:

- **auth_secrets:** No cambia autenticación, secretos ni contratos internos protegidos.
- **rollback_compat:** El cambio es reversible y no altera el esquema ni elimina revisiones históricas.
- **tests:** Se amplían los tests unitarios de elegibilidad para los tres estados de jornada.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-22c-fab-competition-monitoring -->
## 2026-09-14 · sprint-22c-fab-competition-monitoring aprobado

Contexto: se aprobó el spec `sprint-22c-fab-competition-monitoring` (Catálogo y monitorización de competiciones FAB).

Decisiones registradas:

- **auth_secrets:** INGESTION_ADMIN, origen validado, auditoría y prohibición de secretos o RAW en resúmenes.
- **rollback_compat:** Tablas aditivas y feature desactivable sin eliminar catálogo ni afectar la ingesta actual.
- **tests:** Paginación, identidad, parcialidad, idempotencia, locks, autorización y UI responsive.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-23-release-candidate -->
## 2026-09-14 · sprint-23-release-candidate aprobado

Contexto: se aprobó el spec `sprint-23-release-candidate` (Sprint 23 - Release Candidate).

Decisiones registradas:

- **auth_secrets:** Las lecturas privadas exigen sesión y pertenencia; resync y correcciones requieren INGESTION_ADMIN, origen validado y auditoría, y la publicación utiliza un actor o servicio server-side autorizado. Solo el responsable de release designado puede aceptar riesgos altos. Logs, trazas, capturas e informes deben excluir credenciales FAB, tokens, cookies, Authorization, secretos de despliegue, payload RAW no redactado, correos reales y demás PII.
- **rollback_compat:** Web e ingestor se despliegan por digest y el ensayo restaura el digest anterior sin borrar datos, revisiones ni auditoría. Las migraciones son aditivas y compatibles con la versión previa. Los jobs interrumpidos se diagnostican mediante heartbeat, lock y eventos, se detienen ordenadamente y solo se reencolan de forma auditada cuando no existe lock.
- **tests:** La matriz cubre autenticación, ligas privadas, mercado y roster, alineación y cutoff, jornada parcial, publicación y ranking, corrección y republicación, y degradación. Se ejecuta en las versiones soportadas de Chromium, Firefox y WebKit mediante Playwright, en 375x812 y 1440x900, usando la suite determinista 14F y un smoke sobre la jornada FAB real fijada. El informe incluye trazabilidad del candidato, evidencias saneadas y registro firmado de defectos y aceptaciones.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-24-production-1-0 -->
## 2026-09-14 · sprint-24-production-1-0 aprobado

Contexto: se aprobó el spec `sprint-24-production-1-0` (Sprint 24 - Production 1.0).

Decisiones registradas:

- **auth_secrets:** Fija HTTPS, cookies seguras, gestores de secretos, mínimo privilegio, rotación y controles de fuga.
- **rollback_compat:** Despliegue y rollback por digest, migraciones compatibles, datos persistentes y jobs auditables.
- **tests:** Incluye gates, smoke productivo, idempotencia, degradación, rollback, secretos, backup/restore y segunda competición.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-25-production-push-notifications -->
## 2026-09-14 · sprint-25-production-push-notifications aprobado

Contexto: se aprobó el spec `sprint-25-production-push-notifications` (Configuración productiva de Web Push en Supabase y PWA).

Decisiones registradas:

- **auth_secrets:** La identidad siempre deriva de Supabase Auth; RLS impide acceso cruzado y solo la clave VAPID pública llega al cliente. Claves privadas, auth, p256dh, endpoints completos, payloads privados y PII quedan fuera de bundles, respuestas, logs, métricas y evidencias.
- **rollback_compat:** Se elige invalidación explícita sin ventana dual de envío: VAPID_KEY_VERSION detecta el desajuste, elimina la suscripción anterior y requiere nuevo opt-in. El despliegue acepta filas sin versión antes de rotar configuración; la clave anterior solo permanece temporalmente en el gestor para permitir rollback de configuración y nunca se guarda en repo, base de datos o evidencias.
- **tests:** CI usa Supabase/PostgreSQL local aislado, sender falso, reloj controlado, dos dispatchers concurrentes y Playwright Chromium en 375x812 y 1440x900 sin Push real. El smoke exige recepción real con la PWA cerrada en Chromium de escritorio y Android Chrome/PWA instalada; Safari/iOS es compatibilidad observada no bloqueante. La evidencia saneada se conserva por fecha y commit.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-26-push-outbox-railway-worker -->
## 2026-09-15 · sprint-26-push-outbox-railway-worker aprobado

Contexto: se aprobó el spec `sprint-26-push-outbox-railway-worker` (Entrega automática de notificaciones mediante outbox y Railway).

Decisión: implementar según el spec aprobado.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.
