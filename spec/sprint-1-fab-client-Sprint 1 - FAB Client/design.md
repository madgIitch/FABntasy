# sprint-1-fab-client · undefined — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Enfoque

- **data_model:** El cliente devuelve modelos tipados de dispositivo, partidos, categorías y equipos sin acoplarse a Prisma.
- **external_contracts:** Las búsquedas usan exclusivamente POST form-urlencoded contra `/v2/busqueda.ashx`; el registro usa `/dispositivo.ashx`.
- **edge_cases:** La paginación usa `skip`, termina con la respuesta corta o el total y evita páginas concurrentes.
- **ui_states:** No aplica: el cliente no expone UI ni se consume directamente desde el navegador.

