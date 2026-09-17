# sprint-36-home-league-switcher-and-empty-copy · Selector compartido de liga y refinamiento visual de Inicio y Liga — Diseño

## Scope (archivos que puede tocar)

- `apps/web/src/components/**`
- `apps/web/app/app/**`
- `apps/web/e2e/**`
- `apps/web/src/components/home-dashboard.tsx`
- `apps/web/src/components/home-dashboard.module.css`
- `apps/web/src/server/home-dashboard.ts`
- `apps/web/src/server/journey.ts`
- `apps/web/src/server/fantasy-team.ts`
- `apps/web/src/server/home-presentation.ts`
- `apps/web/src/server/home-dashboard.test.ts`
- `apps/web/src/server/home-presentation.test.ts`
- `apps/web/src/server/active-league-selection.test.ts`
- `apps/web/src/app/api/fantasy/leagues/active/route.ts`
- `apps/web/e2e/home-dashboard.spec.ts`
- `apps/web/e2e/visual-fixtures.tsx`
- `tests/**`
- `docs/PRIVATE_LEAGUES.md`
- `docs/ARCHITECTURE.md`
- `docs/ACCESSIBILITY_AND_LOCALE.md`
- `docs/DECISIONS.md`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Reutiliza user_profiles.active_league_id, nullable y aditivo, con validación server-side de membresía ACTIVE, persistencia y fallback determinista definidos en Sprint 34. El cambio entre ligas de distintas competiciones actualiza conjuntamente la competición y la liga activas.
- **external_contracts:** Reutiliza POST /api/fantasy/leagues/active con JSON {"leagueId": string} y los envelopes existentes leagueOk/leagueError. En éxito ejecuta router.refresh() e invalida o revalida las rutas y tags dependientes del perfil y de la liga activa para que Inicio, Mercado, Mi equipo, Jornada y Liga converjan en el resultado canónico del servidor.
- **edge_cases:** Define cero, una y varias ligas; selección de la liga ya activa sin mutación; preferencia o membresía obsoleta; cambios concurrentes y reconciliación entre pestañas; y ligas pertenecientes a competiciones distintas. Con cero ligas se conserva el onboarding actual y con una liga se mantiene el selector informativo y el acceso a gestión.
- **ui_states:** Quedan definidos contenido, pendiente, error, teclado, foco y reglas de cierre: Escape, clic exterior, selección confirmada y navegación a gestión. Con una sola liga se muestran encabezado, marca de liga actual y enlace de gestión. El estado NO_CALENDAR usa el CTA Ver competición con destino /app/competicion.

## Decisiones de la entrevista

- **adv-8663e26e63:** ### [adv-ad438bd09b] Hay conflicto entre «ante cualquier fallo conserva la liga anterior» y el caso en que la membresía elegida deja de ser ACTIVE y el servidor aplica un fallback que puede cambiar la liga activa. Debe decidirse qué criterio prevalece y qué liga/datos debe mostrar el cliente.

**R:**
- **adv-df86171d4d:** ### [adv-3d958be30d] No se especifica el texto ni el destino del CTA de NO_CALENDAR. «Texto describe su destino» admite destinos razonables distintos —por ejemplo Jornada o Competición— y no permite decidir PASA/FALLA.

**R:**
- **adv-7333770a9a:** ## Decisiones registradas
- **error_states:** Sin sesión conserva la redirección/auth existente. Membresía revocada o liga inactiva muestra un aviso, cierra el menú y refresca desde servidor para aplicar el fallback. Conflicto concurrente usa la última selección confirmada por servidor. Fallo de red/5xx mantiene menú y contexto anteriores, anuncia error y permite reintentar. Respuestas tardías no pueden sobrescribir una selección posterior.
- **edge_cases:** Con cero ligas se conserva el onboarding actual. Con una liga se muestra el nombre y chevron; el menú explica que es la actual y ofrece Gestionar mis ligas, sin mutación redundante. Seleccionar la activa solo cierra. Si pierde membresía se aplica fallback server-side. Cambios de otra pestaña se reconcilian en el siguiente refresh/focus sin mezclar datos. Ligas de distintas competiciones actualizan conjuntamente competición y liga.
- **external_contracts:** Reutilizar POST `/api/fantasy/leagues/active` con JSON `{ leagueId }` y los envelopes existentes `leagueOk/leagueError`. En éxito, `router.refresh()` y revalidación/invalidez de las rutas y tags dependientes del perfil/liga activa para que Inicio, Mercado, Mi equipo, Jornada y Liga converjan. La identidad procede siempre de la sesión.
- **ui_states:** Cierra con Escape, clic exterior, selección confirmada y navegación a gestión, restaurando foco salvo que navegue. Con una liga muestra el encabezado, check y enlace de gestión. El CTA de NO_CALENDAR será `Ver competición` y conservará `/app/competicion`, porque el destino es la vista general y no solo un calendario.
- **rollback_compat:** Sí. No hay migración ni cambio incompatible de API. Se reutiliza `active_league_id` y la mutación existente; un rollback del frontend conserva los datos y la selección válida.
- **tests:** Son bloqueantes cero/una/varias ligas; selección activa e idempotente; éxito, doble envío y respuestas fuera de orden; error conservando contexto; membresía obsoleta y fallback; ligas de distinta competición; teclado, Escape, clic exterior, foco y lector; NO_CALENDAR sin copy redundante; coherencia de las cinco superficies; 320/375/768/1024/1440 px; y los gates generales.

