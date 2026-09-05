# Supabase

Supabase es el PostgreSQL gestionado de FABntasy. Prisma usa `DATABASE_URL` para la conexión normal de la aplicación y `DIRECT_URL` para migraciones y operaciones que requieren conexión directa.

## Autenticación web

La PWA usa Supabase Auth con email y contraseña mediante `@supabase/ssr`. El cliente solo recibe `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; ninguna `service_role` key puede usar el prefijo `NEXT_PUBLIC_`.

En Supabase Auth se debe activar la confirmación por correo y configurar como URLs permitidas `/auth/callback` para confirmación y `/auth/callback?next=/actualizar-clave` para recuperación. Las rutas bajo `/app` validan el usuario en servidor mediante `getUser()`.

### Registro y entrega de correo

- El SMTP predeterminado de Supabase solo entrega mensajes a direcciones pertenecientes al equipo de la organización y tiene límites de envío muy bajos. Para registrar usuarios reales se debe configurar un SMTP propio en **Authentication → Emails → SMTP Settings**.
- Mientras no exista SMTP propio, las pruebas de registro deben usar el correo de un miembro del equipo del proyecto.
- La aplicación traduce los códigos de Auth conocidos a mensajes accionables y registra únicamente `code` y `status`; nunca registra el correo ni la contraseña.

### Recuperación de contraseña

- Configurar `NEXT_PUBLIC_SITE_URL` con el origen canónico de cada entorno, sin path (por ejemplo, `http://localhost:3000`).
- Añadir `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=/actualizar-clave` a **Authentication → URL Configuration → Redirect URLs** en Supabase.
- El callback acepta el código PKCE generado por `resetPasswordForEmail` y también plantillas SSR basadas en `token_hash` con `type=recovery`.
- Si se personaliza la plantilla **Reset password**, puede usarse: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/actualizar-clave`.
- `/actualizar-clave` exige una sesión válida creada por el enlace; los enlaces ausentes, inválidos o caducados vuelven a `/recuperar-clave` sin exponer detalles de la cuenta.

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
