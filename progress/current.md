# Sesión actual

Feature: **sprint-23-release-candidate · Sprint 23 - Release Candidate** — estado: `in_progress`.

- agente: codex
- rama: `main`
- intentos: 1

## Siguiente acción

- Completar el manifiesto con IDs FAB, jornada, ligas, responsables y digests reales; provisionar `E2E_STORAGE_STATE`, `E2E_GAME_WITH_STATS_ID`, `E2E_GAME_WITHOUT_STATS_ID` y `E2E_PLAYER_ID`; ejecutar la vertical real y el rollback.

## Resultado local Sprint 23

- Contrato y validador de manifiesto RC: 6/6 tests OK.
- Matriz Playwright: 6 proyectos; smoke público 6 OK, 42 privados omitidos por ausencia de sesión/IDs sembrados.
- Web: typecheck OK, lint OK, 133/133 tests OK.
- Ingestor: 90 tests OK, 5 PostgreSQL omitidos sin base de integración; ruff OK.
- Prisma validate: OK.
- Registro de defectos y taxonomía: implementados.
- Pendiente: smoke FAB real, reconciliación PostgreSQL, flujos privados E2E y rollback por digest.
- Auditoría de dependencias: 3 vulnerabilidades HIGH transitivas corregidas mediante overrides mínimos; queda 1 moderada y el gate pasa.
- Entorno disponible: `DATABASE_URL`, `FAB_ACTIVE_SEASON`, `FAB_CREDENTIALS_FILE` y secreto interno existen en `.env`; no existen `TEST_DATABASE_URL`, confirmación de base de test, sesión E2E ni IDs deportivos E2E. No se ejecutan mutaciones ni smoke real hasta fijar el manifiesto y un target seguro.

## Último resultado

| intento | resultado | gate fallido | tts(s) | coste |
|--:|--|--|--:|--:|
| 1 | OK | — | — | — |
