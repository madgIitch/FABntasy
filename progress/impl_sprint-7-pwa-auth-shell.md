# Implementación · sprint-7-pwa-auth-shell

Estado: `review_pending`.

Completado:

- Supabase Auth SSR con registro, confirmación, login, logout y recuperación de contraseña.
- Protección server-side de `/app`, refresh de sesión y callbacks con redirects allowlisted.
- `user_profiles` enlazado a `auth.users`, trigger idempotente y políticas RLS aplicadas en Supabase.
- Shell responsive con navegación desktop/móvil y estados loading, error, offline y vacío.
- Manifest standalone, icono maskable y service worker limitado a recursos públicos.
- Build Next.js, TypeScript, ESLint, Vitest, Prisma Validate, Ruff y 46 tests Python aprobados.

Pendiente:

- Revisión visual humana en navegador; el navegador automatizado no estaba disponible en el entorno.
