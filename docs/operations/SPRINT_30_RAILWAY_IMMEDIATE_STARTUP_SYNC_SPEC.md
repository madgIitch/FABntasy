# Sprint 30 — Sincronización inmediata al arrancar en Railway

Estado: `spec_ready`; pendiente de aprobación (`spec_approved: false`).

## Decisión de alcance

Railway seguirá arrancando `python -m fab_ingestor run-production`. El supervisor seguirá creando un único `run-scheduler` y el scheduler ejecutará `sync_all()` antes de su primera espera. No se añadirá un cron, un release command de ingesta ni un segundo servicio.

La garantía es **una ejecución inmediata por arranque del proceso scheduler**. Por tanto se aplica tanto a un deploy como a un restart manual o a una recuperación del hijo. No se promete exactamente una ejecución por deployment porque Railway puede reiniciar un proceso más de una vez; la seguridad procede de los advisory locks y UPSERT idempotentes existentes.

## Comportamiento esperado

1. Railway inicia el supervisor productivo después del paso separado de migraciones.
2. El supervisor crea un único scheduler y los workers configurados.
3. El scheduler valida su configuración e invoca inmediatamente `sync_all()`.
4. El ciclo actualiza las competiciones monitorizadas. El catálogo global solo se vuelve a consultar si su política de frescura lo considera debido.
5. El run deja evidencia observable de que su origen es el arranque, con timestamps, estado, código seguro y contadores.
6. Al terminar o fallar de forma controlada se conserva la política normal de intervalo, backoff, circuit breaker y parada por señal.

El intervalo siguiente se mide desde el inicio del ciclo, como ocurre actualmente. Si el ciclo consume todo el intervalo, la espera restante es cero.

## Fallos y concurrencia

- Un solapamiento temporal durante un redeploy no puede duplicar datos.
- Un lock ocupado se registra como resultado diagnosticable, no como éxito ficticio ni como motivo para lanzar tráfico paralelo.
- Un error FAB o PostgreSQL conserva los datos previos y usa los códigos seguros y políticas de reintento existentes.
- `SIGTERM` durante el primer ciclo propaga la cancelación y respeta la gracia de apagado.
- El supervisor puede reiniciar un hijo fallido dentro de su límite; cada nuevo proceso vuelve a intentar un ciclo inmediato de forma idempotente.

## Verificación

Los tests deben demostrar el orden `sync_all` antes de `wait`, una única llamada inicial por proceso, la cadencia posterior, el reinicio supervisado, el fallo inicial, la cancelación y la exclusión concurrente. El runbook de Railway debe indicar cómo localizar el run de arranque y distinguir los estados correcto, fallido, omitido por lock y cancelado.

La implementación no queda autorizada hasta que `spec_approved` sea `true`.
