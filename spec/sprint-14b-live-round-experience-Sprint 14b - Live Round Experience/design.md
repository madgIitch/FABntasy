# sprint-14b-live-round-experience · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** Reutiliza alineaciones, resultados por jornada y boxscores ya versionados; no añade persistencia duplicada.
- **external_contracts:** Se añade un DTO agregado de jornada con estado, quinteto, estadísticas, evolución y navegación.
- **edge_cases:** Cubre falta de equipo, alineación sin congelar, partidos aplazados, DNP, scores pendientes y jornadas históricas.
- **ui_states:** Marcador, timeline de titulares, gráfico accesible, selector de jornada y responsive 320–430 px.

## Decisiones de la entrevista

- **visual_direction:** La Jornada se presenta como un marcador en directo inspirado en retransmisiones deportivas: total dominante, cinco titulares en secuencia, estado legible de cada partido y curva acumulada compacta. Se adapta al sistema visual oscuro, lima y tipografía Oswald de Canastio.
- **data_truth:** Nunca se inventan datos. La UI deriva del snapshot LOCKED y de FantasyRoundScore; los boxscores aportan estadísticas auxiliares. La ausencia de cálculo se muestra como pendiente y no como cero salvo DNP confirmado.

