# sprint-0-project-foundation · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `services/fab_ingestor/**`
- `packages/**`
- `prisma/**`
- `tests/**`
- `.github/workflows/**`
- `.env.example`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** La fundación solo crea el esqueleto de Prisma y una migración inicial vacía; no modela entidades deportivas.
- **external_contracts:** Sprint 0 no realiza llamadas reales a FAB; solo deja interfaces/configuración preparada para el Sprint 1.
- **edge_cases:** La configuración debe validar variables ausentes y separar entorno cliente de servidor sin exponer secretos.
- **ui_states:** La PWA solo necesita un shell mínimo arrancable, sin flujos de producto ni datos simulados de fantasy.

