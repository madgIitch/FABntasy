# sprint-24-production-1-0 · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `services/fab_ingestor/**`
- `packages/**`
- `prisma/**`
- `infrastructure/**`
- `tests/**`
- `.github/workflows/**`
- `.env.example`
- `docs/**`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Reutiliza el modelo vigente; solo admite cambios aditivos y verifica aislamiento y habilitación de una segunda competition_season.
- **external_contracts:** Exige infraestructura reproducible, contratos de hosting/base de datos y backup restaurable en aislamiento.
- **edge_cases:** Cubre reinicios, concurrencia operativa, credenciales, pool, migraciones, backup/restore y segunda competición.
- **ui_states:** Verifica PWA y panel existentes en estados normales y degradados, sin introducir una feature visual nueva.

## Decisiones de la entrevista

- **data_model:** Producción reutiliza PostgreSQL/Supabase y el modelo deportivo, fantasy, auditoría, observabilidad y cola ya aprobados. No crea una fuente de verdad paralela. Solo se permiten migraciones aditivas y compatibles con el release anterior. La segunda competition_season debe habilitarse mediante datos y configuración existentes, manteniendo IDs externos opacos, aislamiento por competition_season y una única competición primaria cuando el contrato lo exija.
- **error_states:** La operación distingue HEALTHY, DEGRADED, STALE y CRITICAL según los umbrales vigentes. FAB, PostgreSQL, ingestor y frontend tienen diagnóstico y recuperación separados. Una dependencia caída conserva lecturas y la última publicación válida cuando sea posible; ningún error se presenta como éxito ni dispara bucles agresivos. Restore, migración o despliegue fallidos bloquean la promoción y dejan evidencia saneada.
- **edge_cases:** Se cubren reinicio durante un job, scheduler duplicado, credencial FAB expirada, pool PostgreSQL agotado, migración parcialmente ejecutada, backup incompleto, restore sobre entorno equivocado, rollback con jobs RUNNING y activación de una segunda competition_season. Los locks, heartbeats, hashes y constraints preservan idempotencia; cualquier reencolado o intervención queda auditado.
- **auth_secrets:** Producción usa HTTPS, cookies HttpOnly/SameSite/Secure y autorización server-side. DATABASE_URL, DIRECT_URL, service-role, credenciales FAB, CANASTIO_INTERNAL_JOB_SECRET y claves privadas permanecen en gestores de secretos y nunca en repositorio, imagen, argumentos, bundles, logs, métricas, backups sin cifrar ni evidencias. Se documentan responsables, acceso mínimo, rotación y comprobación automática de fugas.
- **external_contracts:** Se fijan proveedor, región, dominios y DNS, Supabase/PostgreSQL, Vercel para web y el proveedor ya decidido para el ingestor mediante configuración reproducible. Backups tienen frecuencia, retención, cifrado y ubicación definidos; la restauración se valida en un entorno aislado. FAB continúa encapsulada tras FabClient y su indisponibilidad no se sustituye por scraping ni tráfico inventado.
- **ui_states:** No se añade una nueva feature de producto. La PWA y el panel administrativo existentes deben representar carga, vacío, offline, degradado, obsoleto, error y recuperación sin exponer detalles sensibles. El dominio canónico, instalación PWA y rutas críticas funcionan por HTTPS en los viewports y navegadores soportados, sin depender de tiendas móviles.
- **rollback_compat:** Web e ingestor se promueven por commit y digest inmutables. Las migraciones se ejecutan como paso separado, son compatibles hacia atrás y nunca arrancan desde el worker. El rollback restaura los digests anteriores conservando PostgreSQL, volumen, auditoría y revisiones. Antes de intervenir jobs RUNNING se comprueban heartbeat y locks; solo se reencolan de forma auditada sin lock activo. Backup y restore incluyen RTO/RPO medidos.
- **tests:** Los gates incluyen typecheck, lint, tests web, pytest, ruff, Prisma validate, auditoría de dependencias, diff-scope, build/inspección de imágenes y pruebas PostgreSQL aisladas. Se ejecutan smoke HTTPS/PWA, reinicio idempotente, fallo de dependencias, rollback por digest, escaneo de secretos, backup automático y una restauración completa verificada en un entorno aislado. La habilitación de una segunda competition_season se prueba sin migración destructiva ni contaminación entre competiciones.

