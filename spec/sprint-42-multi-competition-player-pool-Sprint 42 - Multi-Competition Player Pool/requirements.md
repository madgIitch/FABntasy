# sprint-42-multi-competition-player-pool · Selección de competiciones para una liga Fantasy — Requisitos

- name: `Sprint 42 - Multi-Competition Player Pool` · priority: P1 · sdd: true
- aprobado por: peorr · 2026-09-26T17:35:37.704Z

## Contexto

Al crear una liga privada, elegir una o varias competiciones-temporada Fantasy habilitadas cuyos jugadores serán elegibles en la liga.

## Requisitos funcionales

R1. La creación solo acepta una o varias competiciones-temporada Fantasy habilitadas y una principal incluida en la selección.
R2. Plantilla, mercado, ofertas y cláusulas solo admiten jugadores de las ediciones seleccionadas.
R3. Las jornadas usan ventanas de la edición principal y la puntuación de cada jugador usa su propio ruleset.
R4. Las ligas existentes conservan datos y comportamiento al migrarse.
R5. La deshabilitación es inmediata para mutaciones nuevas y preserva el historial.
R6. Pasan pruebas unitarias, PostgreSQL, E2E y gates del repositorio.

## Restricciones

- **error_states:** Lista vacía, IDs inválidos, edición deshabilitada y calendario pendiente.
- **auth_secrets:** Identidad de Supabase Auth y validación server-side.
- **rollback_compat:** Migración aditiva y solo lectura en rollback.
