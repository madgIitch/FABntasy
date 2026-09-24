# Sesión actual

Feature: **sprint-37-fantasy-preseason-registrations · Sprint 37 - Fantasy Preseason Registrations** — estado: `review_pending`.

- agente: codex
- rama: `main`
- spec revisada y aprobada: fallback único por nombre, equipo, competición y temporada con confianza `TENTATIVE`

## Siguiente acción

- Revisar el diff y hacer smoke humano de `/app/admin/ingestion` después de aplicar la migración aditiva en el entorno de despliegue.
- Confirmar que Sevilla 9955 muestra `PLANTILLA_NO_DISPONIBLE` mientras FAB publique cero fichas, sin borrar jugadores de boxscores.
- Cuando FAB publique fichas en 9955, ejecutar sincronización manual y comprobar una plantilla y su boxscore real. La promoción automática a `VERIFIED` requerirá una verificación adicional del ID común; la implementación actual conserva `TENTATIVE`.
- Cerrar con `node .harness/spec.mjs done sprint-37-fantasy-preseason-registrations` tras la revisión humana.

## Evidencia

- FAB de solo lectura: 10027 devuelve 167 fichas en 16 de 48 equipos; 9955 devolvió cero fichas en 21 equipos.
- PostgreSQL temporal: migración deportiva y 3 tests de identidad pasaron (ambos órdenes y dos dispositivos; el test de traspaso conserva `Player`).
- Harness: todos los gates configurados pasaron. Typecheck, lint, 189 tests web y 124 tests Python pasaron; 8 integraciones Python requieren BD y se ejecutaron selectivamente contra PostgreSQL temporal para esta feature.
- Playwright: 12 pruebas pasaron y 48 quedaron omitidas por sus condiciones existentes.
