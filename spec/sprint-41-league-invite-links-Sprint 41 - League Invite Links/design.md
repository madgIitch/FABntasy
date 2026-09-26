# sprint-41-league-invite-links · Invitación a ligas mediante enlace — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Invitación por liga con token opaco, hash de validación y copia cifrada recuperable por el propietario.
- **external_contracts:** Envelope fantasy-league-api.v1 y rutas descritas en docs/league/SPRINT_41_INVITE_LINKS_SPEC.md.
- **edge_cases:** Reingreso, usuario ya miembro, carrera por última plaza y regeneración concurrente.
- **ui_states:** Crear, compartir, landing, autenticación, confirmación, éxito y error sin código o contraseña de liga.

## Decisiones de la entrevista

- **invite_lifetime:** Reutilizable hasta que el propietario lo regenere. No caduca automáticamente ni es de un solo uso.
- **migration:** El enlace sustituye la creación y unión por código y contraseña. Las membresías e historial existentes se conservan.
