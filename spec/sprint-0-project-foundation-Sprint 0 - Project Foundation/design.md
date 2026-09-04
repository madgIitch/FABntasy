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

- **data_model:** La fundación mantiene separados web, ingestor, paquetes compartidos y Prisma; la migración inicial no introduce dominio fantasy.
- **external_contracts:** Los entrypoints son apps/web y services/fab_ingestor; el ingestor mock no llama a FAB.
- **edge_cases:** La configuración ausente, el modo mock y la ejecución desde CI quedan cubiertos por defaults seguros y tests.
- **ui_states:** La PWA entrega únicamente un shell mínimo con estados de arranque y error básicos, sin funcionalidades de producto.

