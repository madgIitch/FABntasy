# Supabase

Supabase es el PostgreSQL gestionado de FABntasy. Prisma usa `DATABASE_URL` para la conexión normal de la aplicación y `DIRECT_URL` para migraciones y operaciones que requieren conexión directa.

## Autenticación web

La PWA usa Supabase Auth con email y contraseña mediante `@supabase/ssr`. El cliente solo recibe `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; ninguna `service_role` key puede usar el prefijo `NEXT_PUBLIC_`.

En Supabase Auth se debe activar la confirmación por correo y configurar como URLs permitidas `/auth/callback` para confirmación y `/auth/callback?next=/actualizar-clave` para recuperación. Las rutas bajo `/app` validan el usuario en servidor mediante `getUser()`.

La migración `20260905000600_pwa_auth_profiles` crea `user_profiles`, sus políticas RLS y un trigger idempotente sobre `auth.users`. La tabla conserva el UUID externo y datos de producto, nunca contraseñas.

Ambas variables son server-side y nunca deben tener el prefijo `NEXT_PUBLIC_`. No se versiona `.env` ni se copian sus valores a `.env.example`.

Para validar el schema:

```powershell
pnpm exec prisma validate
```

Para crear una migración cuando el schema deje de estar vacío:

```powershell
pnpm exec prisma migrate dev --name init
```
