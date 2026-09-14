# sprint-24-production-1-0 · undefined — Requisitos

- name: `Sprint 24 - Production 1.0` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-14T22:24:09.861Z

## Contexto



## Requisitos funcionales

R1. El entorno productivo queda identificado mediante dominio canónico, proveedores, regiones, responsables, release, commit y digests inmutables de web e ingestor; su configuración reproducible vive en `infrastructure/` y ningún paso rutinario depende de una máquina personal.
R2. Todas las rutas públicas y privadas de producción usan HTTPS; las cookies de sesión son HttpOnly, SameSite y Secure en producción, y los headers defensivos y la política same-origin pasan un smoke automatizado sobre el dominio canónico.
R3. DATABASE_URL, DIRECT_URL, claves Supabase privilegiadas, credenciales FAB y secretos internos existen únicamente en gestores server-side con acceso mínimo y rotación documentada; escaneos de repositorio, imagen, bundles, logs y evidencias no encuentran sus valores ni patrones prohibidos.
R4. PostgreSQL dispone de backups automáticos cifrados con frecuencia, retención, propietario y alertas documentados. Una restauración completa se ejecuta en un entorno aislado, verifica esquema, recuentos e invariantes críticas y registra RPO y RTO sin sobrescribir producción.
R5. Web e ingestor se despliegan por digest después de gates y migraciones separadas. Un ensayo restaura ambos digests anteriores sin revertir migraciones destructivamente ni perder datos, auditoría, revisiones publicadas, cola o credenciales persistentes.
R6. Reiniciar o redesplegar el ingestor en reposo y durante un job deja exactamente un scheduler activo, conserva los jobs y converge sin duplicar entidades, estadísticas, puntuaciones, movimientos económicos ni notificaciones deduplicables; heartbeat, locks y eventos permiten diagnosticar cualquier interrupción.
R7. Existe un runbook único o un índice verificable para caída de FAB, PostgreSQL, ingestor y frontend, además de backup/restore, despliegue, rollback y rotación de secretos. Otro operador puede seguir cada procedimiento usando comandos, umbrales, responsables, escalado y criterios de cierre explícitos.
R8. Las versiones activas del ruleset de scoring y del algoritmo de precios, sus hashes/configuración, fecha efectiva y procedimiento de cambio quedan congeladas y documentadas para el inicio de la competición; cualquier cambio posterior exige nueva versión y migración o recomputación explícita y auditable.
R9. La PWA instalada funciona desde el dominio HTTPS en los navegadores soportados, conserva shell/estado offline aprobado y no depende de Google Play ni App Store; autenticación, home, jornada, equipo, mercado, ligas y ranking superan un smoke productivo saneado.
R10. Una segunda competition_season puede descubrirse, sincronizarse y habilitarse mediante configuración y datos, sin migración destructiva ni duplicación de lógica central; las consultas, jobs, puntuaciones, precios y ligas permanecen aislados por competition_season y la competición primaria conserva su identidad.
R11. Fallos simulados de FAB, PostgreSQL, lifecycle, ingestor y frontend producen estados y alertas coherentes, aplican backoff acotado, preservan datos ya publicados y se recuperan según los umbrales vigentes sin intervención destructiva ni exposición de secretos.
R12. El checklist de lanzamiento 1.0.0 incluye preflight, DNS/HTTPS, migraciones, digests, backups, restore probado, secretos, observabilidad, smoke, defectos, rollback, responsables y go/no-go firmado; se publica un changelog 1.0.0 sin datos sensibles.
R13. Typecheck, lint, tests web, pytest, ruff, Prisma validate, pruebas PostgreSQL aisladas, auditoría de dependencias, inspección de imágenes/bundles, smoke HTTPS/PWA, backup/restore, reinicio idempotente, rollback y diff-scope terminan con código cero para el release promovido.

## Restricciones

- **error_states:** Define estados operativos, promoción bloqueada ante fallos y conservación de la última publicación válida.
- **auth_secrets:** Fija HTTPS, cookies seguras, gestores de secretos, mínimo privilegio, rotación y controles de fuga.
- **rollback_compat:** Despliegue y rollback por digest, migraciones compatibles, datos persistentes y jobs auditables.

