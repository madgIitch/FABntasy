# sprint-4-schedule-and-games-ingestion · undefined — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Enfoque

- **data_model:** Game conserva el ID FAB estable, equipos, fase/grupo/ronda, jornada, horario con zona Europe/Madrid, estado y resultado. Se añade un estado de sincronización para distinguir registros presentes y stale sin borrarlos.
- **external_contracts:** La APK confirma `/v2/categoria.ashx`: `Jornadas` y `horariosJornadas` usan `id_categoria_competicion`, `id_fase`, `id_grupo`, `id_ronda`, `fecha_inicial` y `fecha_final`. Se validarán respuestas reales de Copa Delegación antes de normalizar.
- **edge_cases:** `DESCANSA` no crea partidos; aplazamientos y cambios de hora actualizan el mismo Game por ID FAB; valores o equipos no resolubles bloquean ese recorrido sin fusionar por nombre.
- **ui_states:** La operación del sprint es CLI (`sync-competition-games`); no se añade interfaz web.

## Decisiones de la entrevista

- **external_contracts:** Usar el recorrido nativo de categoría de la APK. Validar primero las respuestas reales de `Jornadas` y `horariosJornadas`; no sustituirlo por búsquedas globales ni scraping visual.
- **edge_cases:** Marcar `stale` únicamente después de un recorrido completo exitoso. No borrar automáticamente y no marcar ausencias durante fallos parciales.

