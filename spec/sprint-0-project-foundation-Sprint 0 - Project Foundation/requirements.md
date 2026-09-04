# sprint-0-project-foundation · undefined — Requisitos

- name: `Sprint 0 - Project Foundation` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-04T17:25:02.798Z

## Contexto



## Requisitos funcionales

R1. apps/web y services/fab_ingestor son los únicos entrypoints ejecutables del producto inicial.
R2. pnpm typecheck, pnpm lint, pnpm test, python -m pytest y prisma validate terminan con código 0 en CI.
R3. Ninguna variable que contenga FAB_DEVICE, FAB_KEY, SECRET, PASSWORD o TOKEN puede usar prefijo NEXT_PUBLIC_.
R4. El ingestor importa su configuración exclusivamente desde variables server-side y puede arrancar en modo mock sin red.
R5. Existe docs/ARCHITECTURE.md con el flujo FAB → ingestor → PostgreSQL → API propia → PWA.
R6. Sprint 0 no implementa autenticación, fantasy, mercado ni llamadas reales a FAB.

## Restricciones

- **error_states:** Los shells y el modo mock deben fallar de forma explícita y reproducible, sin requerir red ni base de datos operativa.
- **auth_secrets:** Las credenciales FAB y secretos son exclusivamente server-side; ninguna variable sensible usa NEXT_PUBLIC_.
- **rollback_compat:** La base inicial es reversible en desarrollo y no bloquea futuras migraciones del modelo deportivo.

