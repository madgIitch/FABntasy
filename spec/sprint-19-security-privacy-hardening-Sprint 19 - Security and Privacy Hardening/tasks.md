# sprint-19-security-privacy-hardening · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) Ningún endpoint de usuario acepta `user_id` arbitrario como sustituto de la identidad de sesión; los accesos ajenos fallan sin revelar la existencia del recurso.  ↔ R1
- [ ] (T2) Mercado, ligas, lineup, perfil y administración resuelven actor y permisos server-side en cada lectura o mutación sensible.  ↔ R2
- [ ] (T3) El rate limiting distingue autenticación, mutaciones sensibles y lecturas normales, devuelve 429 con `Retry-After` y no usa identificadores entregados por el cliente como identidad confiable.  ↔ R3
- [ ] (T4) CSP, cookies seguras, protección same-origin/CSRF y headers defensivos se aplican sin romper PWA, Supabase Auth ni Web Push.  ↔ R4
- [ ] (T5) Logs, errores y auditoría redactan cookies, authorization, tokens, contraseñas, claves FAB, VAPID y cuerpos sensibles de forma recursiva y sin distinción de mayúsculas.  ↔ R5
- [ ] (T6) El gate de dependencias bloquea vulnerabilidades altas o críticas conocidas hasta resolución o evaluación documentada, acotada y con caducidad.  ↔ R6
- [ ] (T7) Cambiar correo o contraseña exige sesión reciente o reautenticación; el correo anterior continúa vigente hasta confirmación completada por Supabase Auth.  ↔ R7
- [ ] (T8) La vista de sesiones minimiza dispositivo y momento de actividad, permite revocar otras sesiones y nunca expone refresh tokens, IP completa ni huellas invasivas.  ↔ R8
- [ ] (T9) `Permitir que me encuentren por username` controla descubrimiento e invitaciones nuevas sin romper membresías existentes ni revelar correo o nombre real.  ↔ R9
- [ ] (T10) La exportación contiene exclusivamente datos propios en formato documentado y no incluye secretos, RAW FAB, PII de terceros ni datos privados de otras ligas.  ↔ R10
- [ ] (T11) El borrado requiere confirmación reforzada, revoca sesiones y elimina o anonimiza perfil, avatar y PII sin borrar datos deportivos globales ni romper el histórico competitivo necesario.  ↔ R11
- [ ] (T12) Cerrar sesión conserva tratamiento neutral; eliminar cuenta queda aislado en una zona de peligro con explicación previa y confirmación separada.  ↔ R12
- [ ] (T13) MFA solo se muestra disponible cuando alta, verificación, recuperación y desactivación funcionan de extremo a extremo; mientras tanto figura como `Próximamente`.  ↔ R13
- [ ] (T14) Tests cubren autorización horizontal, rate limiting, headers, CSRF, redacción, dependencias, reautenticación, sesiones, descubrimiento, exportación, borrado/anominización y estados responsive sin servicios externos reales.  ↔ R14
- [ ] Tests que cubran los criterios de aceptación
