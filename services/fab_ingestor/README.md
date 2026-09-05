# FAB ingestor

El ingestor se ejecuta siempre con credenciales FAB y PostgreSQL server-side. Desde este directorio:

```powershell
$env:INGESTOR_MODE = "live"
uv run python -m fab_ingestor sync-all
```

`sync-all` ejecuta un ciclo sobre todas las competiciones seleccionadas y termina. Es el modo recomendado para Windows Task Scheduler, cron o un job de contenedor.

Para mantener un proceso continuo en el dispositivo:

```powershell
uv run python -m fab_ingestor run-scheduler
```

Configuración opcional:

| Variable | Valor por defecto | Restricción |
|---|---:|---|
| `FAB_SCHEDULER_IDLE_MINUTES` | `120` | entre 60 y 180 |
| `FAB_SCHEDULER_ACTIVE_MINUTES` | `10` | entre 5 y 15 |
| `FAB_JOURNEY_WINDOWS` | `FRI 18:00-23:59,SAT 08:00-23:59,SUN 08:00-23:00` | `DIA[+DIA] HH:MM-HH:MM`, zona `Europe/Madrid` |
| `FAB_REQUEST_TIMEOUT_SECONDS` | `10` | entre 1 y 30 |
| `FAB_RETRY_ATTEMPTS` | `3` | entre 1 y 5 |
| `FAB_RETRY_INITIAL_DELAY_SECONDS` | `1` | entre 0 y el máximo |
| `FAB_RETRY_MAX_DELAY_SECONDS` | `8` | entre el inicial y 60 |
| `FAB_CIRCUIT_FAILURE_THRESHOLD` | `3` | entre 1 y 10 |
| `FAB_CIRCUIT_RECOVERY_SECONDS` | `300` | entre 30 y 3600 |

Para volver a descargar boxscores ya definitivos:

```powershell
uv run python -m fab_ingestor sync-all --force-stats
```

Dos procesos no trabajan a la vez sobre la misma competición. Los locks son transaccionales y compatibles con el pool de Supabase. SIGINT y SIGTERM detienen nuevas peticiones entre llamadas FAB; una llamada activa queda acotada por `FAB_REQUEST_TIMEOUT_SECONDS` y el lock se libera al cerrar la transacción.

Cada ciclo y fase queda registrado en `ingestion_runs` mediante estados, códigos de error y contadores. No se guardan mensajes de excepción, credenciales ni payloads en esa tabla.
