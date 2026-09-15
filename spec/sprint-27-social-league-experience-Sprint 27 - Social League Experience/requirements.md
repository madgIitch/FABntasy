# sprint-27-social-league-experience · Actividad social automática y competitiva dentro de ligas privadas — Requisitos

- name: `Sprint 27 - Social League Experience` · priority: P1 · sdd: true
- aprobado por: peorr · 2026-09-15T11:23:28.910Z

## Contexto

Convertir cada liga privada en un grupo social vivo mediante acontecimientos verificables del fantasy, reacciones rápidas y narrativas competitivas generadas por Canastio. La experiencia vive en Liga y no incorpora comentarios, publicaciones libres ni una pestaña Comunidad.

## Requisitos funcionales

R1. La navegación principal mantiene Inicio, Mercado, Plantilla, Liga y Perfil; dentro de Liga existen Clasificación, Actividad y Miembros, y no se crea una pestaña Comunidad ni superficies de publicación manual, comentarios o mensajes de texto libre.
R2. Actividad muestra una cronología descendente y estable de PLAYER_BOUGHT, PLAYER_SOLD, CLAUSE_EXECUTED, PLAYER_PROTECTED, PRICE_CHANGED destacado, MEMBER_JOINED, ROUND_PUBLISHED, ROUND_WINNER, RANK_CHANGED, RECORD_SET y ACHIEVEMENT_EARNED; cada elemento identifica actor opcional, entidad afectada, magnitud, instante y destino contextual comprensible sin depender del icono o color.
R3. Cada evento conserva leagueId, type, occurredAt, payload versionado mínimo y referencia única a la operación o revisión fuente; la creación comparte transacción con el cambio de negocio o usa una outbox duradera, de modo que reintentos y productores concurrentes generan exactamente un evento y nunca una noticia sin operación confirmada.
R4. Los clausulazos se presentan como hitos visuales de máxima prioridad con comprador, manager afectado, jugador e importe histórico exacto, pero conservan la misma semántica, autorización e idempotencia que el resto del feed.
R5. Cada miembro activo puede añadir o retirar una reacción de un catálogo cerrado y administrable (😂, 🔥, 👀, 💀 y 🤡 inicialmente); existe como máximo una reacción por usuario, evento y emoji, los contadores convergen bajo concurrencia y no se acepta texto libre ni contenido aportado por el cliente fuera del catálogo.
R6. Solo miembros activos de una liga pueden leer sus eventos, perfiles sociales, comparativas, presencia y reacciones o reaccionar; salir o ser expulsado revoca el acceso inmediatamente, y pruebas con al menos dos ligas demuestran que API, RLS, cachés, tarjetas y canales en directo no filtran datos cruzados.
R7. El perfil fantasy visible dentro de la liga muestra avatar y nombre ya autorizados, nombre del equipo, posición, valor vigente de plantilla, palmarés, racha, mejor jornada, jornadas ganadas y trofeos; los valores históricos proceden de revisiones publicadas y se distinguen de datos provisionales o no disponibles.
R8. La comparativa Head-to-Head entre dos miembros de la misma liga muestra puntos acumulados comparables, jornadas ganadas, posición media, valor vigente de plantilla y balance por jornadas publicadas; define empates explícitamente, no compara periodos no compartidos y enlaza cada agregado con la temporada y rango de jornadas usados.
R9. Canastio detecta una rivalidad solo mediante reglas versionadas y documentadas basadas en cercanía de clasificación, diferencias mínimas y continuidad de enfrentamientos; la vista explica por qué existe, muestra marcador y diferencia, no usa texto generado no determinista y se recalcula de forma idempotente tras una corrección publicada.
R10. Logros y trofeos se conceden mediante reglas versionadas para campeón de jornada, mejor fichaje, mayor revalorización, remontada, liderazgo continuado y otros logros aprobados; cada concesión referencia inputs y revisión, resuelve empates de forma explícita y una corrección revoca o sustituye el resultado sin perder auditoría.
R11. Durante una jornada activa, Liga muestra jugadores propios en juego, puntos provisionales de cada manager, cambios de posición y un Head-to-Head destacado; las actualizaciones se ordenan por revisión, indican claramente su carácter provisional y convergen con el resultado publicado tras reconexión, eventos fuera de orden o correcciones.
R12. La presencia en directo cuenta únicamente sesiones activas recientes de miembros autorizados de la liga, usa expiración automática, no expone identidades salvo decisión futura aprobada y no se utiliza como fuente histórica ni mecanismo de vigilancia.
R13. Un usuario puede seguir o dejar de seguir jugadores reales de la misma competitionSeason; actuaciones destacadas y cambios importantes de valor generan avisos según umbrales versionados y configurables, con deduplicación por usuario, jugador, jornada, revisión y tipo, y respetan preferencias y opt-in de Push existentes.
R14. Las tarjetas compartibles de resultado, ranking, fichaje, MVP y logro se generan desde datos publicados, incluyen marca y contexto suficiente, omiten datos privados y secretos, soportan descarga o Web Share cuando esté disponible y ofrecen una alternativa accesible cuando no lo esté; abrir la imagen no concede acceso a la liga.
R15. El feed ofrece vacío guiado, esqueletos de carga, error con últimos datos disponibles y reintento, además de paginación por cursor opaco que conserva posición; nombres largos, importes de ocho cifras y estados sin datos funcionan desde 320 px sin overflow horizontal.
R16. La generación retroactiva se limita a eventos reconstruibles de forma determinista desde operaciones y revisiones autoritativas, queda marcada como backfill y no dispara Push; desplegar con la feature desactivada mantiene todas las funciones actuales y el rollback de aplicación conserva eventos, reacciones, seguimientos y auditoría para una reactivación posterior.
R17. Consultas de Actividad y Miembros usan paginación y agregados acotados, el modo en directo aplica reconexión con backoff y fallback a refresco, y las pruebas de carga verifican los presupuestos vigentes sin introducir consultas por evento o por miembro.
R18. Tests unitarios, de integración PostgreSQL/RLS y E2E cubren autorización, taxonomía, orden estable, deduplicación, reacciones concurrentes, perfiles, Head-to-Head, rivalidades, logros, correcciones, presencia expirada, directo fuera de orden, seguimiento, Push, tarjetas, accesibilidad y responsive; typecheck, lint, test, Prisma validate y diff-scope finalizan con código cero.

## Restricciones

- **error_states:** Vacío, carga, error con datos conservados, reintento, paginación, provisionalidad, offline/reconexión y ausencia de Web Share definidos.
- **auth_secrets:** Acceso limitado a miembros activos, aislamiento entre ligas y seasons, tarjetas sin concesión de acceso, payloads mínimos y preferencias Push respetadas.
- **rollback_compat:** Migraciones aditivas, feature flag, backfill determinista sin Push y conservación de datos sociales al revertir la aplicación.

