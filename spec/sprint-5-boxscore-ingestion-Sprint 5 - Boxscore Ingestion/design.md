# sprint-5-boxscore-ingestion · undefined — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** Player, PlayerRegistration y PlayerGameStat reciben identidad FAB, equipo/partido y estadísticas nullable. Game conserva el estado de validación del boxscore.
- **external_contracts:** La APK confirma POST `/v2/envivo/estadisticas.ashx` con `id_dispositivo`, `key` e `id_partido`. Una llamada real sobre un partido ACB terminado de la XXIX Copa Andalucía (02/09/2026, `TipoActa=ESTADÍSTICAS`) devolvió `resultado=correcto`, 13 jugadores por equipo y los campos requeridos por el mapper.
- **edge_cases:** Ausencia no equivale a cero; jugadores sin ID estable son provisionales y se separan por fuente/equipo; correcciones posteriores actualizan filas sin borrar auditoría RAW.
- **ui_states:** Operación CLI; no se añade interfaz web en este sprint.
