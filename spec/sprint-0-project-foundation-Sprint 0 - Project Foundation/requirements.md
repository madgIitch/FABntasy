# sprint-0-project-foundation · undefined — Requisitos

- name: `Sprint 0 - Project Foundation` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-04T21:27:33.189Z

## Contexto



## Requisitos funcionales

R1. `apps/web` y `services/fab_ingestor` son los únicos entrypoints ejecutables del producto inicial.
R2. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `python -m pytest` y `prisma validate` terminan con código 0 en CI.
R3. Ninguna variable que contenga FAB_DEVICE, FAB_KEY, SECRET, PASSWORD o TOKEN puede usar prefijo NEXT_PUBLIC_.
R4. El ingestor importa su configuración exclusivamente desde variables server-side y puede arrancar en modo mock sin red.
R5. Existe `docs/ARCHITECTURE.md` con el flujo FAB → ingestor → PostgreSQL → API propia → PWA.
R6. Sprint 0 no implementa autenticación, fantasy, mercado ni llamadas reales a FAB.

## Restricciones

- **error_states:** Los shells deben arrancar en modo mock y los gates deben fallar de forma visible si una herramienta obligatoria no está disponible.
- **auth_secrets:** FAB_DEVICE, FAB_KEY, SECRET, PASSWORD y TOKEN son siempre server-side; ninguna variable sensible usa NEXT_PUBLIC_.
- **rollback_compat:** La migración inicial es vacía y la estructura permite continuar sin autenticación, fantasy ni mercado.

