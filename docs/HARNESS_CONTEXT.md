# Contexto operativo para el harness

Este documento resume el contexto de `fabntasy_command_cookbook.md` y `fantasy_fab_ingesta.md` que debe respetarse durante las features.

## Integración FAB

- Host: `https://appaficion.andaluzabaloncesto.org`.
- Registro: `POST /dispositivo.ashx`, acción `registrar`.
- Búsquedas confirmadas: `POST /v2/busqueda.ashx` con `application/x-www-form-urlencoded` y acciones `buscarPartido`, `buscarCategoria` y `buscarEquipo`.
- La paginación usa `skip`, de forma secuencial; el máximo observado es 20 resultados por página.
- Las respuestas pueden devolver una `key` nueva. Debe persistirse de forma atómica.
- Estadísticas: `POST /v2/envivo/estadisticas.ashx` con `id_dispositivo`, `key` e `id_partido`.
- PDF de estadísticas mediante `descargar.ashx`: únicamente respaldo, depuración o auditoría; el JSON estructurado es la fuente primaria.

## Seguridad y operación

- `FAB_DEVICE_ID`, `FAB_KEY` y `DATABASE_URL` son siempre server-side y nunca pueden usar `NEXT_PUBLIC_`.
- `INGESTOR_MODE=mock` debe funcionar sin red; `live` exige credenciales privadas.
- No registrar credenciales ni cuerpos completos con secretos.
- Usar timeout, backoff acotado, rate limiting, caché y user-agent identificable.
- Los tests unitarios no dependen de llamadas reales a FAB; usar fixtures anonimizadas y mocks HTTP.

## Flujo previsto

`buscarCategoria` -> competición/categoría -> grupos/fases -> jornadas -> partidos -> `TipoActa=ESTADÍSTICAS` -> boxscore JSON -> PostgreSQL -> API propia -> PWA.

Las firmas de `fasesGrupos`, `Jornadas`, `horariosJornadas` y la respuesta de estadísticas ya se validaron mediante llamadas reales. No inventar parámetros ni usar scraping visual como sustituto.

## Sincronización de boxscores

- Partido explícito: `uv run python -m fab_ingestor sync-game-stats --game-id <ID_FAB>`.
- Competición seleccionada: `uv run python -m fab_ingestor sync-competition-stats --category-id <ID_CATEGORIA>`.
- Solo son elegibles partidos sincronizados, terminados y con `TipoActa=ESTADÍSTICAS`.
- Un payload incompleto se conserva saneado como RAW, no publica filas normalizadas y queda reintentable.
- El contrato se validó inicialmente con un partido ACB terminado del 02/09/2026. La primera acta terminada de Copa Delegación y la primera de 1.ª Provincial son validaciones operativas posteriores y no bloquean el despliegue inicial de la liga provincial.

## Límites de Sprint 0

Sprint 0 solo crea la fundación, configuración server-side, modo mock, contratos y migración vacía. No implementa llamadas reales FAB, autenticación, fantasy ni mercado.

## Decisión responsive de producto

- Canastio se diseña mobile-first con referencia base de 360–430 px y `100svh` para el primer viewport.
- El CTA principal debe quedar visible sin scroll en la portada móvil y tener un alto táctil mínimo de 44 px.
- La marca y el titular nunca pueden quedar recortados horizontalmente; el logo es ambiental y no compite con el contenido.
- La navegación inferior móvil contiene como máximo cinco destinos y respeta `safe-area-inset-bottom`.
- Las tablas deportivas eliminan columnas secundarias en móvil antes de recurrir al scroll horizontal; el boxscore puede desplazarse por necesitar comparación tabular.
- Estados loading, vacío, error y sin estadísticas deben seguir siendo legibles a 320 px sin depender del color.
