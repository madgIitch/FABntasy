# sprint-27-social-league-experience · Actividad social automática y competitiva dentro de ligas privadas — Diseño

## Scope (archivos que puede tocar)

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

## Enfoque

- **data_model:** Stream de eventos versionado e idempotente, reacciones de catálogo cerrado, seguimientos, rivalidades y logros derivados de fuentes autoritativas; presencia efímera separada de datos históricos.
- **external_contracts:** Eventos con referencia fuente y payload versionado; cursores opacos, revisiones publicadas, presencia con expiración y avisos deduplicados.
- **edge_cases:** Concurrencia, duplicados, empates, correcciones, eventos fuera de orden, backfill, nombres largos, importes grandes y periodos no comparables cubiertos.
- **ui_states:** Liga contiene Clasificación, Actividad y Miembros; hitos destacados, feed continuo, perfiles, Head-to-Head, directo, seguimientos y tarjetas accesibles desde 320 px.

