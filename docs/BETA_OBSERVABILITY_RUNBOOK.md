# Runbook de observabilidad beta

## Propiedad, severidad y privacidad

El on-call de plataforma lidera incidentes de ingesta/PostgreSQL; el responsable web lidera aplicación y cliente. `DEGRADED` exige triage en horario operativo; `CRITICAL` requiere aviso inmediato al responsable de producto y actualizaciones periódicas. Las señales técnicas se retienen 30 días como máximo; el feedback, separado de telemetría, 180 días o hasta su resolución y posterior purga. Nunca copiar tokens, cookies, DSN, cuerpos, RAW, correos, nombres privados ni IDs de usuario a tickets o dashboards.

## Diagnóstico y triage

1. Abrir `/app/admin/status`, confirmar timestamp de última señal, frescura, componente, backlog, bloqueos, error rate y p95.
2. Correlacionar por componente/operación/categoría/release; no por usuario ni mensaje libre. Comprobar FAB, PostgreSQL, web e ingestor por separado.
3. Declarar severidad: crítica si se acumulan pérdida de heartbeat/bloqueo y otro síntoma; degradada si cruza un umbral aislado. Comunicar alcance, hora UTC, release y siguiente actualización, sin datos privados.
4. Recuperar la dependencia o hacer rollback de aplicación/proveedor. Los flags `CANASTIO_ERROR_TRACKING_ENABLED`, `CANASTIO_USAGE_METRICS_ENABLED` y `CANASTIO_FEEDBACK_ENABLED` desactivan escrituras independientemente; no cambian contratos de negocio.
5. Cerrar solo tras recuperación explícita, backlog drenado, último éxito reciente y p95/error rate dentro del presupuesto. Registrar cronología, causa, impacto y acción preventiva saneados.

## Pausa y reanudación segura

- Ingesta: detener el scheduler/worker de forma ordenada (SIGTERM) y esperar que la ejecución actual cierre; reanudar arrancando el mismo servicio. Advisory locks e idempotencia evitan solapes y no se borra información.
- Scoring: desactivar el job interno de lifecycle, nunca modificar resultados publicados. Al reanudar, ejecutar la recomputación idempotente y verificar revisión antes de publicar.
- Mercado: bloquear temporalmente nuevas mutaciones en el gateway/despliegue, manteniendo lecturas. Reanudar tras comprobar transacciones abiertas y versión esperada; nunca publicar un lote parcial.

La migración de feedback es aditiva. Retirar un sink o volver a una release anterior deja la tabla intacta y no necesita migración destructiva. El smoke local usa sinks en memoria e inyecciones sintéticas; no llama FAB ni proveedores externos.
