# Sesión actual

Feature: **sprint-41-league-invite-links · Invitación a ligas mediante enlace** — estado: `done`, `spec_approved: true`.

- Aprobación del usuario: enlaces reutilizables hasta regeneración, sin código ni contraseña de liga.
- Implementación: invitación inicial al crear, recuperación/regeneración por owner, landing pública mínima, continuidad tras login/registro, confirmación transaccional, retiro de endpoints heredados y conservación de membresías.
- La migración `20260926000100_league_invite_links` se aplicó a PostgreSQL local desechable `canastio_test` y a la base Supabase configurada en `.env`; `prisma migrate status` confirmó que no quedan migraciones pendientes.
- `typecheck`, `lint`, 202 pruebas unitarias, `prisma validate`, build de Next, integración PostgreSQL de concurrencia/rotación y revisión visual/accesibilidad dirigida de 25 capturas pasan. `diff-scope` pasa.
- La revisión visual completa del repositorio falló en el fixture ajeno de admin (`admin failed to render`); los casos dirigidos de onboarding, invitación, login y registro pasaron sin desbordes ni errores graves.
- Sprint 40 permanece en `review_pending` a la espera de su smoke humano.

## Siguiente acción

- Mantener estable `LEAGUE_INVITE_ENCRYPTION_KEY` o `SUPABASE_SERVICE_ROLE_KEY` al desplegar el nuevo código.
- El smoke humano del enlace compartido en dos cuentas reales, registro por correo, unión, regeneración y última plaza no consta en el registro; comprobarlo tras el despliegue.
