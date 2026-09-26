# Revisión · Sprint 41

Estado: `done` por solicitud explícita del usuario el 2026-09-26.

## Evidencia

- Migración Prisma aplicada con éxito en PostgreSQL local aislado `canastio_test`.
- Migración `20260926000100_league_invite_links` aplicada también a la base Supabase configurada en `.env`; `prisma migrate status` confirmó que no quedan migraciones pendientes.
- Integración real: creación con invitación inicial, recuperación para liga anterior, owner exclusivo, carrera por última plaza, reintento idempotente, regeneración y revocación del enlace antiguo.
- 202 pruebas unitarias correctas; integración PostgreSQL dirigida correcta; `typecheck`, `lint`, `prisma validate`, build Next y diff-scope correctos.
- Revisión Playwright dirigida: onboarding, liga, invitación, login y registro en 320, 375, 768, 1024 y 1440 px: 25 capturas sin desbordes ni errores graves de accesibilidad; el botón de unión llega a la liga con API simulada.

## Límites de la comprobación

- La continuidad con confirmación de correo y dos cuentas Supabase reales requiere smoke humano tras despliegue. La prueba Playwright dirigida usa un fixture para la API, mientras la unión y concurrencia se comprobaron contra PostgreSQL real.
- La revisión visual completa del repositorio falla en el fixture de admin por `Cannot read properties of undefined (reading 'filter')`, fuera del flujo de invitaciones; la revisión dirigida sí pasa.
- El smoke humano con dos cuentas reales no consta en el registro al cierre. El secreto efectivo para cifrar invitaciones debe permanecer estable.
