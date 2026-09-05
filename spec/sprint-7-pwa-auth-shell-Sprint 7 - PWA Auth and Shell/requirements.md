# sprint-7-pwa-auth-shell · undefined — Requisitos

- name: `Sprint 7 - PWA Auth and Shell` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-05T12:29:17.804Z

## Contexto



## Requisitos funcionales

R1. AC1: Registro, inicio y cierre de sesión usan Supabase Auth con email/contraseña; el alta exige verificación de correo y la recuperación usa enlaces de un solo uso con retorno permitido a la aplicación.
R2. AC2: Las rutas privadas validan la identidad de Supabase server-side antes de renderizar; una sesión ausente, inválida o caducada redirige al login sin filtrar datos privados.
R3. AC3: Existe un perfil de aplicación enlazado al UUID de Supabase Auth, creado idempotentemente sin almacenar hashes de contraseña ni duplicar la identidad del proveedor.
R4. AC4: Solo la clave publicable de Supabase puede llegar al cliente; service-role key, secretos FAB, DATABASE_URL y tokens de sesión no aparecen en HTML, bundles, source maps, logs ni respuestas públicas.
R5. AC5: Registro, login y recuperación presentan estados accesibles de carga, éxito, credenciales inválidas, email no verificado, enlace expirado, rate limit, offline y error inesperado, sin revelar si una cuenta ajena existe.
R6. AC6: La aplicación ofrece un shell responsive mobile-first con navegación Inicio, Mi equipo, Mercado, Ligas, Jugadores y Perfil; las secciones aún no implementadas muestran estados vacíos coherentes sin inventar datos.
R7. AC7: El manifest permite instalación standalone y el service worker cachea únicamente shell y recursos públicos versionados; nunca cachea respuestas autenticadas ni permite mutaciones offline.
R8. AC8: La protección de auth usa cookies Secure/HttpOnly/SameSite cuando corresponda, redirects allowlisted, rate limiting y defensas CSRF para mutaciones; los callbacks rechazan destinos externos.
R9. AC9: Tests sin servicios reales cubren formularios, callbacks, refresh/caducidad de sesión, rutas privadas, redacción de secretos, manifest y política de caché; una prueba de integración verifica el flujo Supabase en entorno de test.

## Restricciones

- **error_states:** Estados explícitos para credenciales inválidas, email sin verificar, enlace expirado, rate limit, sesión caducada, offline y error inesperado.
- **auth_secrets:** Cookies seguras y validación server-side; service-role key y secretos FAB exclusivamente en servidor.
- **rollback_compat:** Migración aditiva para el perfil; desactivar auth no altera las tablas deportivas existentes.

