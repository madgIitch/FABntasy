# Checklist de lanzamiento 1.0.0

- [ ] Preflight y diff-scope limpios; commit: `________`
- [ ] Typecheck, lint, web tests, pytest, ruff, Prisma validate y PostgreSQL aislado: evidencia `________`
- [ ] Auditoría de dependencias e inspección de imágenes/bundles/secretos: `________`
- [ ] DNS canónico y HTTPS/HSTS: `________`
- [ ] Migraciones aditivas separadas: `________`
- [ ] Digest web `sha256:________`; anterior `sha256:________`
- [ ] Digest ingestor `sha256:________`; anterior `sha256:________`
- [ ] Backup cifrado válido y restore aislado probado; RPO `____`; RTO `____`
- [ ] Secretos, permisos y rotaciones revisados por security-owner
- [ ] Observabilidad/alertas HEALTHY; un scheduler activo
- [ ] Smoke HTTPS/PWA/auth/home/jornada/equipo/mercado/ligas/ranking saneado
- [ ] Reinicio idempotente, degradación y rollback por digest ensayados
- [ ] Segunda competition_season aislada e identidad primaria preservada
- [ ] Registro de defectos: cero BLOCKER; HIGH aceptados y con caducidad `________`
- [ ] Responsables disponibles: product/web/data/security
- [ ] Go / No-go: `____`; product-owner firma/fecha: `________`

No adjuntar secretos, PII, cookies, Authorization ni payloads RAW.

