# sprint-7-pwa-auth-shell · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `prisma/**`
- `packages/**`
- `tests/**`
- `public/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Enfoque

- **data_model:** Perfil de aplicación enlazado uno a uno con el UUID de Supabase Auth; la contraseña no se replica en Prisma.
- **external_contracts:** Supabase Auth por email/contraseña con verificación y recuperación por correo mediante SDK SSR oficial.
- **edge_cases:** Redirecciones seguras, refresh de sesión, múltiples pestañas y retorno desde enlaces de verificación o recuperación.
- **ui_states:** Shell responsive con estados de carga, error y offline; navegación privada protegida.

## Decisiones de la entrevista

- **auth_secrets:** Usar Supabase Auth con email y contraseña, verificación por correo y recuperación de contraseña. La sesión se transporta mediante cookies seguras y se valida server-side antes de servir rutas o datos privados. Las claves privilegiadas y los secretos FAB nunca llegan al navegador.
- **external_contracts:** Supabase es el proveedor gestionado de PostgreSQL y autenticación del proyecto. La integración web seguirá el SDK SSR oficial y separará claramente la clave pública publicable de cualquier service-role key server-side.

