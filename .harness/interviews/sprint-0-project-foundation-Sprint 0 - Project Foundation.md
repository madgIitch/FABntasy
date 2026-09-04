# Entrevista · sprint-0-project-foundation · Sprint 0 - Project Foundation

- name: `Sprint 0 - Project Foundation`
- estado: **dimensiones cubiertas** → aprueba con `spec.mjs approve sprint-0-project-foundation`

## Cobertura de dimensiones

- ✅ data_model — La fundación mantiene separados web, ingestor, paquetes compartidos y Prisma; la migración inicial no introduce dominio fantasy.
- ✅ error_states — Los shells y el modo mock deben fallar de forma explícita y reproducible, sin requerir red ni base de datos operativa.
- ✅ edge_cases — La configuración ausente, el modo mock y la ejecución desde CI quedan cubiertos por defaults seguros y tests.
- ✅ auth_secrets — Las credenciales FAB y secretos son exclusivamente server-side; ninguna variable sensible usa NEXT_PUBLIC_.
- ✅ external_contracts — Los entrypoints son apps/web y services/fab_ingestor; el ingestor mock no llama a FAB.
- ✅ ui_states — La PWA entrega únicamente un shell mínimo con estados de arranque y error básicos, sin funcionalidades de producto.
- ✅ rollback_compat — La base inicial es reversible en desarrollo y no bloquea futuras migraciones del modelo deportivo.
- ✅ tests — Los gates obligatorios cubren TypeScript, lint, Vitest, pytest y Prisma validate.

## Scope propuesto

- `apps/web/**`
- `services/fab_ingestor/**`
- `packages/**`
- `prisma/**`
- `tests/**`
- `.github/workflows/**`
- `.env.example`
- `docs/**`
- `spec.json`

## Acceptance propuesto

1. apps/web y services/fab_ingestor son los únicos entrypoints ejecutables del producto inicial.
2. pnpm typecheck, pnpm lint, pnpm test, python -m pytest y prisma validate terminan con código 0 en CI.
3. Ninguna variable que contenga FAB_DEVICE, FAB_KEY, SECRET, PASSWORD o TOKEN puede usar prefijo NEXT_PUBLIC_.
4. El ingestor importa su configuración exclusivamente desde variables server-side y puede arrancar en modo mock sin red.
5. Existe docs/ARCHITECTURE.md con el flujo FAB → ingestor → PostgreSQL → API propia → PWA.
6. Sprint 0 no implementa autenticación, fantasy, mercado ni llamadas reales a FAB.
