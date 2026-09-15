# sprint-28-manager-profile-rivalries · Perfil fantasy completo, palmarés visual y acceso a rivalidades — Diseño

## Scope (archivos que puede tocar)

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

## Enfoque

- **data_model:** El perfil, histórico y racha se calculan bajo demanda desde FantasyRoundScore publicado y LeagueAchievementAward. La revisión vigente es la no supersedida de mayor revision para liga, temporada, jornada y equipo; las revisiones anteriores permanecen inmutables y enlazadas mediante supersedesId o el mecanismo vigente equivalente. No se añaden snapshots salvo que un gate de rendimiento lo justifique.
- **external_contracts:** La tarjeta implementa manager-profile-share.v1 con una allowlist explícita. Se genera como PNG 1200x630 image/png, con nombre canastio-perfil-<slug-publico>.png, sin IDs ni URL de liga. El orden de fallback es Web Share con archivo cuando canShare lo admita, descarga PNG y copia de un resumen textual saneado.
- **edge_cases:** La racha v1 cuenta jornadas publicadas consecutivas en las que el equipo termina como líder único o colíder. Un empate en el máximo cuenta como victoria compartida; una puntuación inferior, ausencia de score o hueco en la secuencia corta la racha. Nunca cruza temporadas y las correcciones retroactivas recalculan la secuencia usando exclusivamente revisiones vigentes.
- **ui_states:** La URL canónica es /app/ligas/{leagueId}/managers/{publicManagerId}. El retorno usa returnTo restringido a rutas relativas allowlisted de la misma liga y un token local no sensible para restaurar pestaña, filtros, cursor, scroll y foco. Si falta, caduca o es inválido, la navegación vuelve a /app/ligas/{leagueId}?tab=members. Nunca se aceptan destinos absolutos aportados por el cliente.

## Decisiones de la entrevista

- **adv-dde4cb3ba7:** ### [adv-29e5c0f241] El contrato de autorización es contradictorio: se menciona 403/404, pero no se decide qué casos devuelven cada código ni qué cuerpo público comparten para evitar filtrar existencia.

**R:**
- **adv-353181bcb0:** ### [adv-77e0f45c9a] No se define cómo se calculan posición y valor de plantilla ni cuándo cada métrica debe marcarse PUBLISHED, PROVISIONAL o UNAVAILABLE.

**R:**
- **adv-bd38bae036:** ### [adv-16a33ebb12] Falta la regla versionada exacta de racha: qué constituye victoria, tratamiento del empate, jornada sin score, huecos, interrupciones, cambio de temporada y correcciones retroactivas.

**R:**
- **adv-02e6f33445:** ### [adv-de7fab58cc] Falta el contrato versionado completo de la tarjeta compartible: allowlist positiva exacta, formato, dimensiones, nombre de archivo y contenido del fallback de copia.

**R:**
- **adv-bf895d1d9c:** ### [adv-91ddac1f4f] No está especificada la regla versionada de detección de Rivalidad —umbrales, ventana temporal, empates y mínimo de jornadas—, por lo que no puede decidirse cuándo el acceso debe estar habilitado.

**R:**
- **adv-02635f8ca3:** ## Decisiones registradas
- **data_model:** Calcular bajo demanda desde FantasyRoundScore publicado y LeagueAchievementAward, sin snapshots nuevos salvo que un gate de rendimiento demuestre que son necesarios. La revisión vigente es la no supersedida de mayor revision para liga, temporada, jornada y equipo; las filas históricas permanecen inmutables y se enlazan mediante supersedesId o el mecanismo vigente equivalente. `LeagueAchievementAward` admite los siete códigos de `trophy-icons.v1`; la corona es una proyección vigente, mientras que podio, último final, MVP y último de jornada son concesiones auditables.
- **error_states:** Actor sin sesión devuelve 401; liga o manager inexistente, ajeno o ya no ACTIVE devuelve siempre 404 con RESOURCE_NOT_FOUND para no filtrar existencia; cursor inválido devuelve 422 INVALID_CURSOR. Avatar roto degrada localmente a iniciales sin fallar el perfil. Fallo de tarjeta o share mantiene el perfil y ofrece reintento o el siguiente fallback con mensaje accesible.
- **edge_cases:** Racha v1 significa jornadas publicadas consecutivas terminadas como líder único o colíder; un empate en el máximo cuenta como victoria compartida. Una jornada publicada con score inferior, sin score del equipo o un hueco en la secuencia corta la racha. Nunca cruza temporada. Una corrección retroactiva recalcula toda la secuencia desde revisiones vigentes y puede cambiar el resultado sin borrar revisiones anteriores. Para `ROUND_MVP` y `ROUND_LAST_PLACE`, un empate exacto concede el logro a todos; para el podio, último final y corona se usa el orden canónico ya desempatatado de la clasificación.
- **external_contracts:** Contrato manager-profile-share.v1 con allowlist: nombre público, nombre del equipo, nombre público de competición/temporada, posición, valor, racha, mejor jornada y resumen de trofeos publicados. Generar PNG 1200x630 image/png, nombre canastio-perfil-<slug-publico>.png, sin URL de liga ni IDs. Orden: navigator.share con archivo si canShare lo admite; descarga PNG; y copia de un resumen textual saneado como último fallback.
- **ui_states:** URL canónica /app/ligas/{leagueId}/managers/{publicManagerId}. Los enlaces añaden returnTo limitado a rutas relativas allowlisted de esa liga y un token local de restauración no sensible para pestaña, cursor, scroll y elemento de foco. Atrás usa ese estado si es válido; tras recarga o enlace directo vuelve a /app/ligas/{leagueId}?tab=members. Nunca se acepta una URL absoluta aportada por el cliente.
- **rollback_compat:** Entrega estrictamente aditiva y compatible con Sprint 27, sin backfill bloqueante. Premios antiguos incompletos se muestran como Histórico anterior con los campos disponibles y UNAVAILABLE en los ausentes. Un flag server-side desactiva rutas y entradas nuevas; el rollback de aplicación conserva todas las filas, premios y revisiones y mantiene operativas las superficies de Sprint 27.
- **tests:** Bloqueante: fixtures PostgreSQL con dos ligas, dos miembros activos por liga, un expulsado, perfil propio, avatar válido/ausente/roto, empate, hueco, jornada sin score, corrección supersedida y cursor con inserción concurrente. Unit cubre agregados, racha, los siete códigos, empate de jornada, exclusividad de corona y unicidad del podio; integración cubre servicio y RLS; E2E Chromium cubre 320, 375, 768, 1024 y 1440, assets correctos, proporción sin recorte, etiquetas y textos alternativos, teclado, nombres/roles y share de archivo, descarga y copia mediante stubs deterministas.

