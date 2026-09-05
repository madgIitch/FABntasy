# Implementación · sprint-4-schedule-and-games-ingestion

Estado: `review_pending`.

Completado:

- Contratos `Jornadas` y `horariosJornadas` extraídos de la APK y validados con Copa Delegación real.
- Cliente form-urlencoded con validación estricta y persistencia RAW saneada.
- Normalización de jornadas, partidos, horarios UTC, estados, resultados, parciales y `TipoActa`.
- Fecha centinela FAB de 1900 normalizada como partido sin horario.
- Partidos contra `DESCANSA` omitidos.
- Resolución estricta de equipos contra las inscripciones sincronizadas.
- Upsert idempotente por ID opaco FAB y marcado `stale` solo tras un recorrido completo.
- Migración `20260905000300_schedule_sync_status` aplicada en Supabase.
- Sync real ejecutado dos veces: 8 jornadas, 9 partidos y 6 descansos; segunda pasada con 0 altas y 9 actualizaciones.
- Smoke humano del calendario revisado con fechas y enfrentamientos reales.
- 31 tests aprobados contra Supabase, incluidos identidad estable y rollback; Ruff y Prisma Validate aprobados.

Pendiente:

- Ninguno; listo para cierre formal.
