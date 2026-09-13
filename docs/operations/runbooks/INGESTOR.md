# Runbook del ingestor productivo

## Desplegar

1. Verificar aprobación operativa, commit y que `main` pasa `ingestor-production`.
2. Crear proyecto vacío, ejecutar `scripts/deployment/provision-railway.ps1 -ProjectId <id>` y aplicar en Railway los límites de `service-config.json`. En **Service → Settings → Source**, fijar `Root Directory` a `/services/fab_ingestor`; en **Config as Code**, fijar la ruta absoluta `/infrastructure/railway/railway.toml`. Esto evita que Railpack detecte el monorepo raíz como Node.
3. Cargar mediante el panel de secretos `DATABASE_URL` (pooler, `sslmode=require`), `DIRECT_URL` solo al entorno GitHub, `CANASTIO_FANTASY_LIFECYCLE_URL=https://...`, `CANASTIO_INTERNAL_JOB_SECRET`, `INGESTOR_MODE=live` y la ruta del volumen. No pegarlos en comandos/logs.
4. Promover `repo@sha256:<64 hex>`. Ejecutar `verify-deployment.ps1 -ImageRef ...`; confirmar UID/GID 10001, una réplica, un scheduler, un worker y heartbeat <10 min.

## Salud y alertas

- HEALTHY: heartbeat <10 min, sin jobs bloqueados y error rate/p95 bajo Sprint 22.
- DEGRADED: dependencia/reintentos o backlog creciente, pero heartbeat reciente.
- STALE: heartbeat ≥10 min. Acknowledge una única alerta deduplicada, consultar deployment/restarts y DB sin imprimir variables.
- Backlog: alerta si `QUEUED > 20` durante 10 min. Confirmar que el worker reclama un job elegible <2 min; detener scheduler duplicado antes de reencolar.
- `FAILED` o ciclo fallido: registrar `error_code`, dependencia y timestamps saneados. FAB: 3 intentos 1/2 s, circuito 300 s. PostgreSQL: 1/2/4/8/16 s hasta 60 s y sin nuevos claims. Lifecycle: 3 intentos 1/2 s, sin publicación parcial. Tras restaurar, exigir HEALTHY <10 min y alerta resuelta una vez.

## Restart, job atascado y exclusión

Antes de actuar, inspeccionar heartbeat, `claimed_by`, `started_at`, `heartbeat_at`, lock y audit event. Escalar a cero está prohibido. Un `RUNNING` interrumpido conserva timestamps y pasa a diagnóstico manual `WORKER_TERMINATED`; solo con lock ausente y aprobación se reencola, dejando evento de auditoría. Nunca actualizar datos deportivos para “arreglar” una cola. Un SIGTERM debe impedir nuevos claims, cerrar conexiones y terminar ≤10 s.

## Rotar secretos

FAB: ejecutar `register-device` dentro de la réplica con el volumen montado; la sustitución es atómica. Reiniciar y verificar `probe-auth`; restaurar el backup anterior si falla. Lifecycle: aceptar temporalmente secreto anterior+nuevo en Vercel, cambiar Railway, verificar llamada correcta y rechazos indistinguibles 401 sin cuerpo/log sensible, retirar el anterior. No reencolar mientras una llamada siga RUNNING.

## Backup/restore del volumen

Detener claims, tomar backup saneado/cifrado, comprobar checksum y retención de siete días. Restaurar en un volumen nuevo privado, permisos UID/GID 10001, apuntar el mount, ejecutar `probe-auth`, reiniciar y comprobar misma identidad válida. Registrar solo checksum, fecha y resultado.

## Rollback

Seleccionar el digest anterior aprobado y ejecutar promoción por digest. No revertir migraciones. Confirmar que base, cardinales de cola y volumen no cambian; verificar heartbeat, exclusión y un job. Si hay RUNNING, seguir el diagnóstico anterior antes de restaurar el consumidor.

## Smoke real (requiere firma previa)

Solo 1ª Provincial Senior Masculina Sevilla 2026/2027, una jornada publicada, máximo tres partidos. Ejecutar `sync-all` y jobs GAME/ROUND/COMPETITION dos veces; guardar estados, duración, contadores y cardinales/clave natural. Cero duplicados. Ventana desde 60 min antes hasta último validado, máximo 6 h. Guardar evidencia saneada con la plantilla del sprint.
