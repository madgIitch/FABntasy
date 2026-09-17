# sprint-34-active-league-management-separation · Separación entre liga activa y gestión de ligas — Diseño

## Scope (archivos que puede tocar)

- `apps/web/app/app/**`
- `apps/web/app/globals.css`
- `apps/web/app/api/fantasy/leagues/**`
- `apps/web/e2e/visual-fixtures.tsx`
- `apps/web/src/app/api/fantasy/leagues/**`
- `apps/web/src/components/**`
- `apps/web/src/server/private-leagues.ts`
- `apps/web/src/server/private-league-http.ts`
- `apps/web/src/server/rollout.ts`
- `apps/web/src/server/user-profile.ts`
- `apps/web/src/server/active-league-selection.test.ts`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `tests/**`
- `docs/PRIVATE_LEAGUES.md`
- `docs/ARCHITECTURE.md`
- `docs/CONVENTIONS.md`
- `docs/DECISIONS.md`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** No define dónde se persiste la liga activa, su cardinalidad por usuario ni qué ocurre al abandonar la liga seleccionada.
- **external_contracts:** Se preservan los contratos PREVIEW/OPEN y las operaciones existentes, pero no se define el contrato versionado para listar membresías ni seleccionar la liga activa.
- **edge_cases:** Menciona una o varias ligas y estados vacíos, pero no resuelve owner, abandono de la activa, membresías de distintas competiciones ni concurrencia entre pestañas.
- **ui_states:** La separación de destinos está clara, pero faltan estados concretos de carga, vacío, error, guardado, éxito, offline, conflicto y foco posterior a cada mutación.

## Decisiones de la entrevista

- **data_model:** ### [error_states] ¿Qué códigos y comportamiento UI deben aplicarse a liga inexistente o no autorizada, código/contraseña inválidos, límite de 20 miembros, membresía duplicada, conflicto de versión, liga activa obsoleta y fallo de red?

**R:**
- **edge_cases:** ### [external_contracts] ¿Qué rutas, métodos, envelope, campos, nullabilidad, versionado y semántica idempotente deben tener la lista de Mis ligas y la mutación de selección activa?

**R:**
- **ui_states:** ### [rollback_compat] ¿Debe introducirse la selección activa de forma aditiva y nullable, manteniendo compatibles los endpoints actuales y un fallback server-side determinista durante despliegue mixto y rollback?

**R:**
