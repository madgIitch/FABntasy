# Sprint 14F — ciclo acumulativo T0–T11

El comando `cycle` conserva un único `run_id` y avanza la misma liga por mercado, draft, bloqueo, directo, finalización, publicación, repricing, actividad y corrección.

```powershell
$env:CANASTIO_TEST_DATABASE = "1"
node scripts/test-data.mjs cycle `
  --profile small `
  --seed 1406 `
  --clock 2026-10-05T18:00:00+02:00 `
  --run-id cycle_full_14f `
  --identity-map .local/qa-users.json
```

T8 es un checkpoint interno: todos los partidos y estadísticas están finalizados, pero todavía no existen puntuaciones publicadas. En perfiles `small` y `realistic`, todos los managers reciben siete jugadores exclusivos, cinco titulares, dos suplentes, score y posición. T10 genera jugadores que suben, bajan y permanecen estables. T11 conserva revisiones anteriores de score y precio.

Para producción, configura tanto en el ingestor como en la web:

```text
CANASTIO_FANTASY_LIFECYCLE_URL=https://<host>/api/internal/fantasy/lifecycle
CANASTIO_INTERNAL_JOB_SECRET=<secreto-server-side>
```

No expongas el secreto con prefijo `NEXT_PUBLIC_`. Si falta una de las dos variables, el ingestor aborta; si faltan ambas, mantiene el modo compatible de solo ingesta.
