# Sesión actual

Feature: **sprint-41-league-invite-links · Invitación a ligas mediante enlace** — estado: `review_pending`, `spec_approved: true`.

- Aprobación del usuario: enlaces reutilizables hasta regeneración, sin código ni contraseña de liga.
- Implementación: invitación inicial al crear, recuperación/regeneración por owner, landing pública mínima, continuidad tras login/registro, confirmación transaccional, retiro de endpoints heredados y conservación de membresías.
- La migración `20260926000100_league_invite_links` se aplicó únicamente a PostgreSQL local desechable `canastio_test`, no al entorno remoto.
- `typecheck`, `lint`, 202 pruebas unitarias, `prisma validate`, build de Next, integración PostgreSQL de concurrencia/rotación y revisión visual/accesibilidad dirigida de 25 capturas pasan. `diff-scope` pasa.
- La revisión visual completa del repositorio falló en el fixture ajeno de admin (`admin failed to render`); los casos dirigidos de onboarding, invitación, login y registro pasaron sin desbordes ni errores graves.
- Sprint 40 permanece en `review_pending` a la espera de su smoke humano.

## Siguiente acción

- En despliegue, aplicar la migración antes del nuevo código y mantener estable `LEAGUE_INVITE_ENCRYPTION_KEY` o `SUPABASE_SERVICE_ROLE_KEY`.
- Smoke humano del enlace compartido en dos cuentas reales, registro por correo, unión, regeneración y última plaza. Tras validarlo, cerrar con `node .harness/spec.mjs done sprint-41-league-invite-links`.
