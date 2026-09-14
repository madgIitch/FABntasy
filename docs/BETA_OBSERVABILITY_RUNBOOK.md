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
## Señales Web Push

`push.metrics.v1` publica únicamente conteos de entrega por resultado, tasa `(FAILED + EXPIRED) / intentos` en 15 minutos, backlog `<5m`, `5–15m`, `>15m` y endpoints expirados en 15 minutos. No se permiten dimensiones de usuario, liga, endpoint, payload, claves ni texto de excepción.

- `PUSH_FAILURE_RATE_HIGH`: warning si supera 10% durante 15 minutos.
- `PUSH_BACKLOG_OLD`: warning si la entrega pendiente más antigua supera 10 minutos.
- `PUSH_ENDPOINTS_EXPIRED`: warning desde 5 endpoints en 15 minutos.

Diagnóstico: comprobar preflight VAPID y versión (sin mostrar valores), backlog/lease y códigos agregados. Ante 404/410 confirmar que solo cae el dispositivo afectado. Ante backlog, detener nuevos productores si crece, preservar filas y recuperar claims al vencer 5 minutos. Cierre: tasa bajo umbral durante una ventana completa, backlog sin filas >10 minutos y prueba saneada en un dispositivo autorizado.
