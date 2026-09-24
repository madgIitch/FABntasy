# sprint-38-disable-fantasy-competition · Deshabilitar una competición para Fantasy — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `services/fab_ingestor/**`
- `prisma/**`
- `docs/**`
- `spec/**`
- `progress/**`
- `tests/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Se reutilizan `fantasy_enabled` y `fantasy_role` sin borrar entidades ni referencias históricas.
- **external_contracts:** La monitorización deportiva continúa y el ingestor omite fases Fantasy mientras esté deshabilitada.
- **edge_cases:** Se cubren primaria, selección activa, carreras, reintentos y reactivación.
- **ui_states:** El panel confirma la edición afectada; ligas suspendidas muestran un estado claro en URL directa.

