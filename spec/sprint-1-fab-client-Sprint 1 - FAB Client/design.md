# sprint-1-fab-client · undefined — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Enfoque

- **data_model:** Las credenciales se abstraen tras un almacén server-side con sustitución atómica; las respuestas RAW son opcionales y deben quedar anonimizadas.
- **external_contracts:** El cliente usa POST form-urlencoded contra /dispositivo.ashx y /v2/busqueda.ashx según los contratos FAB ya confirmados.
- **edge_cases:** La paginación avanza secuencialmente mediante skip, termina ante página vacía o incompleta y evita concurrencia sobre el mismo recurso.
- **ui_states:** La feature no incorpora interfaz de usuario; expone un cliente Python reemplazable para el ingestor.

