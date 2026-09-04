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

Las firmas exactas de `fasesGrupos`, `Jornadas` y `horariosJornadas`, además de la respuesta real de estadísticas de un partido terminado, siguen pendientes de validación. No inventar parámetros ni usar scraping visual como sustituto.

## Límites de Sprint 0

Sprint 0 solo crea la fundación, configuración server-side, modo mock, contratos y migración vacía. No implementa llamadas reales FAB, autenticación, fantasy ni mercado.
