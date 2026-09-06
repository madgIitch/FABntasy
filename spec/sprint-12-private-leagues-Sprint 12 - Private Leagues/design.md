# sprint-12-private-leagues · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** Liga, membership, invitación y equipo por liga decididos.
- **external_contracts:** Rutas, versión y expectedVersion definidos.
- **edge_cases:** Capacidad, reingreso, owner y concurrencia definidos.
- **ui_states:** Flujos completos y responsive definidos.

## Decisiones de la entrevista

- **data_model:** FantasyLeague pertenece a una competitionSeason y tiene nombre, owner, estado y límite de 20 miembros. LeagueMembership relaciona perfil y liga con rol OWNER o MEMBER y estado ACTIVE o LEFT. LeagueInvite conserva solo el hash de un token opaco de alta entropía, estado, expiración y revocación. FantasyTeam pasa a pertenecer a una liga y es único por usuario y liga; así propietario, precio pagado, roster y futuras cláusulas son independientes en cada liga, mientras PlayerPrice continúa siendo global.
- **error_states:** Códigos estables: LEAGUE_NOT_FOUND para inexistencia o acceso no autorizado, INVITE_INVALID, INVITE_EXPIRED, INVITE_REVOKED, ALREADY_MEMBER, LEAGUE_FULL, OWNER_CANNOT_LEAVE, CONFIRMATION_REQUIRED y VERSION_CONFLICT. Todo rechazo conserva memberships, invitaciones y equipos sin cambios parciales.
- **edge_cases:** Máximo 20 memberships ACTIVE incluyendo owner. Un usuario puede abandonar y volver mediante invitación válida sin duplicar historial. El owner no puede abandonar; transferir propiedad queda fuera del MVP. Revocar o regenerar invitación no expulsa miembros. La unión concurrente al último hueco admite exactamente una transacción. Cada liga nueva empieza sin rosters rivales y cada miembro crea su plantilla propia.
- **auth_secrets:** El actor procede de Supabase Auth server-side. IDs de usuario del request nunca sustituyen la sesión. Los tokens usan al menos 128 bits aleatorios, se guardan mediante SHA-256 y nunca se registran. La landing pública revela solo nombre de liga, competición y ocupación.
- **external_contracts:** API `fantasy-league-api.v1`: POST/GET `/api/fantasy/leagues`, GET/PATCH/DELETE `/api/fantasy/leagues/[leagueId]`, POST `/api/fantasy/leagues/[leagueId]/invites`, POST `/api/fantasy/leagues/join` y POST `/api/fantasy/leagues/[leagueId]/leave`. Mutaciones usan expectedVersion. La intención de invitación sobrevive auth mediante cookie HttpOnly, SameSite=Lax y TTL de 24 horas.
- **ui_states:** `/app/ligas` muestra ligas, crear y unirse; `/liga/[token]` es la landing compartible y conserva intención al autenticar. La ficha de liga muestra miembros, código/enlace para owner, revocación y salida. Incluye loading, vacío guiado, llena, invitación inválida/expirada/revocada, conflicto, offline y confirmación destructiva; funciona desde 320 px.
- **rollback_compat:** La migración crea para cada FantasyTeam existente una liga personal de compatibilidad y membership OWNER antes de hacer leagueId obligatorio. No altera roster, snapshots, acquisitionPrice ni scores. Un flag server-side desactiva mutaciones y mantiene lecturas. Rollback de desarrollo restaura la unicidad anterior solo si no existen equipos adicionales por usuario/temporada.
- **tests:** Tests puros cubren tokens y permisos; PostgreSQL real cubre constraints, migración, concurrencia del último hueco, reingreso e idempotencia; API/E2E cubren crear, compartir, autenticarse, unirse, revocar, abandonar y autorización. No hay red FAB.

