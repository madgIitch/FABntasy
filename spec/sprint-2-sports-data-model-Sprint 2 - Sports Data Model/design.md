# sprint-2-sports-data-model · undefined — Diseño

## Scope (archivos que puede tocar)

- `prisma/**`
- `apps/web/src/server/**`
- `services/fab_ingestor/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Enfoque

- **data_model:** Prisma define UUID internos y relaciones normalizadas para federación, competición, temporada, edición, grupo, jornada, equipo, inscripción, jugador, inscripción, partido, estadísticas, identificadores externos y payloads RAW. Los repositorios Python realizan UPSERT sobre claves naturales documentadas.
- **external_contracts:** `external_ids` usa `source`, `entity_type`, `external_id` y `entity_id`; conserva IDs opacos como texto y establece unicidad por fuente, tipo e ID externo. Prisma gobierna migraciones y Python escribe directamente en PostgreSQL.
- **edge_cases:** Los campos aún no publicados por FAB son nullable; un jugador sin identificador estable puede conservar identidad provisional por fuente y contexto, sin fusionarse por nombre; partidos reprogramados actualizan el mismo registro.
- **ui_states:** No hay UI en este sprint; las consultas de servidor solo exponen datos deportivos normalizados y nunca payloads RAW por defecto.

## Decisiones de la entrevista

- **data_model:** No deduplicar por nombre. Crear una identidad provisional ligada a fuente y contexto; solo fusionarla mediante una corrección explícita y auditable en una feature posterior.
- **external_contracts:** Prisma mantiene el esquema y las migraciones. El ingestor Python escribe directamente en PostgreSQL a través de repositorios transaccionales con SQL parametrizado y UPSERT.

