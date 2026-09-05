# sprint-8-sports-explorer · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** Usa exclusivamente el modelo deportivo normalizado existente; los agregados se derivan de player_game_stats y no se persisten como nueva fuente de verdad.
- **external_contracts:** La API pública propia expone competición, equipos, partidos y jugadores desde PostgreSQL y pagina los listados grandes.
- **edge_cases:** Contempla partidos sin estadísticas, campos nullable, listados grandes paginados y datos todavía no sincronizados.
- **ui_states:** Incluye clasificación/calendario, ficha de partido con o sin boxscore, ficha de jugador, búsqueda y filtros básicos.

## Decisión responsive aprobada

- Mobile-first para 360–430 px, con comprobación adicional a 320 px.
- Navegación inferior de cinco destinos, targets táctiles de al menos 44 px y respeto de safe areas.
- Clasificación y jugadores reducen columnas secundarias en móvil; el boxscore conserva scroll horizontal controlado.
- La portada debe mostrar marca, propuesta y CTA dentro del primer `100svh`, sin recorte horizontal.
