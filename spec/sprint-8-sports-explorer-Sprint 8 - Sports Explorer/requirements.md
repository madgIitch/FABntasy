# sprint-8-sports-explorer · undefined — Requisitos

- name: `Sprint 8 - Sports Explorer` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-05T13:23:49.616Z

## Contexto



## Requisitos funcionales

R1. AC1: La PWA no hace requests al dominio de Afición FAB.
R2. AC2: Un partido sin estadísticas muestra marcador/estado sin inventar boxscore.
R3. AC3: Los agregados de jugador se recalculan desde player_game_stats.
R4. AC4: Los datos externos muestran last_synced_at o estado equivalente cuando sea útil.
R5. AC5: La API pagina listados grandes y no devuelve payloads RAW.
R6. AC6: Tests E2E cubren calendario, partido con/sin estadísticas y ficha de jugador.

## Restricciones

- **error_states:** La UI distingue carga, ausencia de datos, error y partidos sin estadísticas, sin inventar boxscores.
- **auth_secrets:** Las lecturas deportivas pasan por la API propia; no se exponen credenciales, payloads RAW ni llamadas directas a Afición FAB.
- **rollback_compat:** Es una capa de lectura y presentación sobre el esquema existente; cualquier cambio de Prisma debe ser aditivo y reversible.
