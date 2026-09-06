# Implementación · Sprint 12 - Private Leagues

## 2026-09-06 — estado: review_pending

- Modelo de ligas, memberships e invitaciones con equipos por liga.
- Migración compatible aplicada en Supabase; cada equipo previo conserva roster y recibe una liga personal.
- Tokens de 128 bits almacenados solo como SHA-256, revocación y caducidad de 24 horas.
- Capacidad transaccional de 20 miembros con bloqueo del último hueco, reingreso y salida.
- API `fantasy-league-api.v1` y superficies `/app/ligas`, ficha y `/liga/[token]`.
- Intención de invitación conservada en cookie HttpOnly durante autenticación.

## Verificación

- TypeScript: OK
- ESLint: OK
- Vitest: 33 tests OK
- Prisma validate: OK
- Migración `20260906000300_private_leagues`: aplicada

## Pendiente

- Smoke humano de crear, compartir y unirse desde dos usuarios antes de marcar `done`.
