# sprint-22-beta-observability · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `services/fab_ingestor/**`
- `prisma/**`
- `infrastructure/**`
- `tests/**`
- `scripts/**`
- `.github/workflows/**`
- `.env.example`
- `docs/**`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** fuentes operativas existentes, feedback separado, agregados y retención acotados.
- **external_contracts:** adaptadores, esquema versionado, sink de test y separación de feedback definidos.
- **edge_cases:** deduplicación, cardinalidad, tormentas, obsolescencia y despliegues cubiertos.
- **ui_states:** contenido, permisos y estados de status y feedback definidos.

## Decisiones de la entrevista

- **data_model:** `IngestionRun`, `IngestionJob`, `IngestionHeartbeat` y `AdminAuditEvent` siguen siendo las fuentes operativas de jobs. Se añade solo la persistencia mínima para feedback separado de logs técnicos y, si hace falta para métricas internas, agregados técnicos con retención limitada; no se copian payloads FAB, contenido privado de ligas ni eventos de usuario individuales como perfiles de comportamiento.
- **error_states:** La salud distingue `HEALTHY`, `DEGRADED` y `CRITICAL`. Las señales separan al menos fallos de FAB, base de datos, aplicación web e ingestor, además de jobs fallidos, bloqueados o con backlog. Un fallo del proveedor de telemetría nunca rompe la petición de producto ni genera recursión de errores; la página interna muestra datos parciales y su frescura cuando una fuente no responde.
- **edge_cases:** Los errores equivalentes se agrupan por código, operación, componente y versión desplegada, no por mensaje libre o identidad. Se limitan frecuencia, tamaño y cardinalidad; reintentos del mismo job no crean alertas independientes sin contexto de intento. Heartbeats y backlog usan timestamps UTC y umbrales configurables. Se cubren caída simultánea de FAB y DB, telemetría indisponible, relojes desfasados, feedback repetido y despliegues que cambian versión.
- **auth_secrets:** Nunca se capturan tokens, cookies, contraseñas, credenciales FAB, DSN completos, cuerpos de request/response, payloads RAW, correos, nombres de liga, notas privadas ni IDs directos de usuario. La redacción es central, aplicada antes de cualquier transporte y probada con canarios sintéticos. Dashboard, status interno y detalle técnico requieren rol de administrador resuelto server-side. Usuarios autenticados pueden enviar feedback con categoría y texto acotado; el vínculo técnico usa un identificador de correlación opaco y no expone logs.
- **external_contracts:** La instrumentación se define detrás de adaptadores server/client y un sink local determinista para tests; el spec no obliga a un proveedor comercial. El transporte es no bloqueante, configurable y desactivable. Los eventos usan un esquema versionado con timestamp UTC, release, environment, component, operation, result, errorCategory y correlationId opcional. El feedback usa una API interna versionada distinta y no se envía al sink técnico.
- **ui_states:** La ruta administrativa resume salud global, última actualización, heartbeat, último éxito, jobs fallidos, backlog y tasas/latencias por componente, con estados carga, vacío, parcial, obsoleto, error y offline. No muestra stack traces ni datos sensibles. El feedback accesible desde la app admite categoría, texto breve y consentimiento explícito para adjuntar solo contexto técnico saneado; muestra envío, éxito, error recuperable y evita doble envío.
- **rollback_compat:** Los cambios son aditivos. Error tracking, métricas de uso y feedback tienen flags server-side independientes y degradan a no-op. La retirada del proveedor conserva la operación local y no exige migraciones destructivas. El runbook documenta cómo pausar temporalmente scoring, mercado e ingesta mediante controles existentes o flags explícitos, cómo reanudar y cómo comprobar que no se pierde ni publica estado parcial.
- **tests:** Tests unitarios y de integración inyectan errores sintéticos de FAB, DB, web y cliente y verifican categoría, agrupación, redacción y no interferencia. En la ventana operativa, heartbeat con más de 10 minutos, cualquier job `RUNNING` sin progreso durante 15 minutos, backlog `QUEUED` mayor de 20 durante 10 minutos, tasa de error superior al 2% durante 5 minutos o p95 por encima del presupuesto del Sprint 20 durante 10 minutos producen estado degradado o crítico y una señal deduplicada. Se prueba acceso admin, feedback separado, flags, telemetría caída y runbook mediante smoke tests sin servicios externos reales.

