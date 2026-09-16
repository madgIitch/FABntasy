# Runbook del ingestor en Railway

## Despliegue y primer ciclo

Railway arranca `python -m fab_ingestor run-production`. El supervisor crea exactamente un `run-scheduler` y los workers configurados. El scheduler ejecuta un `sync_all` inmediatamente y después continúa de forma periódica: cada 60–180 minutos en reposo o cada 30–900 segundos dentro de una ventana de jornada, según las variables `FAB_SCHEDULER_*`.

La primera ejecución de cada proceso scheduler se registra en `ingestion_runs` como `sync_all_startup`. Las siguientes se registran como `sync_all_scheduled`; una ejecución directa de CLI usa `sync_all_manual`. Esta distinción no contiene ningún identificador ni secreto de Railway.

Tras desplegar:

1. Comprueba que los logs contienen `FAB ingestion scheduler started` una sola vez por proceso.
2. Consulta la fila más reciente `sync_all_startup` de cada competición monitorizada.
3. Verifica su `started_at`, `finished_at`, `status`, contadores y `error_code` seguro.
4. Confirma más tarde la aparición de `sync_all_scheduled`; demuestra que el proceso sigue siendo periódico y no un job de una sola ejecución.

## Interpretación

- `succeeded`: terminó el ciclo inmediato.
- `failed`: una fase falló; revisa su run hijo y el código seguro.
- `skipped_locked`: otro proceso poseía el advisory lock. Es seguro y evita duplicados.
- `cancelled`: Railway envió una señal de parada durante el ciclo.
- sin fila: el proceso no llegó a enumerar esa competición; revisa arranque, configuración y acceso a PostgreSQL.

Si el panel muestra `NOT_SYNCED` pero existen TeamRegistration, comprueba que `fab_competition_catalog.competition_season_id` esté enlazado por `FAB_CATEGORY_COMPETITION`. Nunca reconstruyas esa relación usando `opaque_id`. Un contador `rejected` en stats puede corresponder a un partido retirado por FAB; tres respuestas saneadas `Id no válido` lo dejan `stale` sin detener el resto de la competición.

Un deploy o reinicio puede arrancar más de un proceso de forma sucesiva. Cada proceso intenta su propio ciclo inicial; los advisory locks y UPSERT idempotentes protegen los datos frente a solapamientos. No añadas un cron ni un segundo servicio scheduler.

El ciclo inicial no fuerza el catálogo global. La política de frescura decide si ese barrido corresponde, mientras que las competiciones monitorizadas sí se procesan inmediatamente.
