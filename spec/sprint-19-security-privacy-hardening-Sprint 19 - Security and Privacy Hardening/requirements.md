# sprint-19-security-privacy-hardening · undefined — Requisitos

- name: `Sprint 19 - Security and Privacy Hardening` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-12T10:06:49.598Z

## Contexto



## Requisitos funcionales

R1. Ningún endpoint de usuario acepta `user_id` arbitrario como sustituto de la identidad de sesión; los accesos ajenos fallan sin revelar la existencia del recurso.
R2. Mercado, ligas, lineup, perfil y administración resuelven actor y permisos server-side en cada lectura o mutación sensible.
R3. El rate limiting distingue autenticación, mutaciones sensibles y lecturas normales, devuelve 429 con `Retry-After` y no usa identificadores entregados por el cliente como identidad confiable.
R4. CSP, cookies seguras, protección same-origin/CSRF y headers defensivos se aplican sin romper PWA, Supabase Auth ni Web Push.
R5. Logs, errores y auditoría redactan cookies, authorization, tokens, contraseñas, claves FAB, VAPID y cuerpos sensibles de forma recursiva y sin distinción de mayúsculas.
R6. El gate de dependencias bloquea vulnerabilidades altas o críticas conocidas hasta resolución o evaluación documentada, acotada y con caducidad.
R7. Cambiar correo o contraseña exige sesión reciente o reautenticación; el correo anterior continúa vigente hasta confirmación completada por Supabase Auth.
R8. La vista de sesiones minimiza dispositivo y momento de actividad, permite revocar otras sesiones y nunca expone refresh tokens, IP completa ni huellas invasivas.
R9. `Permitir que me encuentren por username` controla descubrimiento e invitaciones nuevas sin romper membresías existentes ni revelar correo o nombre real.
R10. La exportación contiene exclusivamente datos propios en formato documentado y no incluye secretos, RAW FAB, PII de terceros ni datos privados de otras ligas.
R11. El borrado requiere confirmación reforzada, revoca sesiones y elimina o anonimiza perfil, avatar y PII sin borrar datos deportivos globales ni romper el histórico competitivo necesario.
R12. Cerrar sesión conserva tratamiento neutral; eliminar cuenta queda aislado en una zona de peligro con explicación previa y confirmación separada.
R13. MFA solo se muestra disponible cuando alta, verificación, recuperación y desactivación funcionan de extremo a extremo; mientras tanto figura como `Próximamente`.
R14. Tests cubren autorización horizontal, rate limiting, headers, CSRF, redacción, dependencias, reautenticación, sesiones, descubrimiento, exportación, borrado/anominización y estados responsive sin servicios externos reales.

