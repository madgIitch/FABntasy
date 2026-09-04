# sprint-2-sports-data-model · undefined — Requisitos

- name: `Sprint 2 - Sports Data Model` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-04T22:11:44.043Z

## Contexto



## Requisitos funcionales

R1. AC1: Federation, Competition, Season, CompetitionSeason, Group, Round, Team, TeamRegistration, Player, PlayerRegistration, Game y PlayerGameStat usan IDs internos UUID y relaciones con integridad referencial; toda entidad sincronizable puede vincularse a uno o más `external_ids` FAB.
R2. AC2: `external_ids` conserva el identificador externo como texto opaco y aplica unicidad `(source, entity_type, external_id)`; los repositorios rechazan que el mismo identificador externo apunte a dos entidades internas.
R3. AC3: Repetir cualquier UPSERT con la misma clave natural mantiene el mismo ID interno y no incrementa el número de filas; cada lote se ejecuta en una transacción y revierte completamente ante error.
R4. AC4: Un jugador con identificador FAB estable conserva una sola identidad y puede tener varias PlayerRegistration por temporada/equipo; sin identificador estable no se fusionan jugadores únicamente por nombre.
R5. AC5: Game conserva estado, `scheduled_at` UTC, zona horaria original cuando exista, jornada, local, visitante, marcadores nullable, estado externo, `TipoActa`, `has_statistics`, `source_updated_at` y `last_seen_at`; una reprogramación actualiza el mismo Game.
R6. AC6: PlayerGameStat es único por `(game_id, player_registration_id)` y admite como nullable minutos/milisegundos, puntos, tiros anotados e intentados, rebotes, asistencias, robos, pérdidas, tapones, faltas, valoración y plus_minus; no contiene puntuación fantasy.
R7. AC7: RawFabPayload conserva endpoint, entity_type, external_id nullable, retrieved_at, HTTP status, checksum y JSON; antes de persistir elimina recursivamente `key`, `id_dispositivo`, token, password y secret, y nunca se devuelve desde consultas públicas por defecto.
R8. AC8: La migración inicial deportiva puede aplicarse y revertirse en PostgreSQL de desarrollo; `prisma validate` pasa y los tests de integración verifican constraints, rollback transaccional, reprogramación e idempotencia real.
R9. AC9: El ingestor Python es el escritor de datos FAB mediante repositorios PostgreSQL; Prisma sigue siendo la fuente de verdad del esquema y la PWA no consulta FAB directamente.

## Restricciones

- **error_states:** Una referencia deportiva inexistente, conflicto de identidad externa o payload inválido aborta la transacción sin dejar escrituras parciales; los errores no incluyen credenciales ni payloads completos.
- **auth_secrets:** `raw_fab_payloads.payload` se sanea antes de persistir y rechaza claves sensibles (`key`, `id_dispositivo`, token, password, secret); la base no almacena credenciales FAB en tablas deportivas.
- **rollback_compat:** La migración solo añade tablas deportivas, es reversible en desarrollo y no modifica el contrato del `FabClient` ni introduce tablas fantasy.

