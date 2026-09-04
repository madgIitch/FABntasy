# sprint-0-project-foundation · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) apps/web y services/fab_ingestor son los únicos entrypoints ejecutables del producto inicial.  ↔ R1
- [ ] (T2) pnpm typecheck, pnpm lint, pnpm test, python -m pytest y prisma validate terminan con código 0 en CI.  ↔ R2
- [ ] (T3) Ninguna variable que contenga FAB_DEVICE, FAB_KEY, SECRET, PASSWORD o TOKEN puede usar prefijo NEXT_PUBLIC_.  ↔ R3
- [ ] (T4) El ingestor importa su configuración exclusivamente desde variables server-side y puede arrancar en modo mock sin red.  ↔ R4
- [ ] (T5) Existe docs/ARCHITECTURE.md con el flujo FAB → ingestor → PostgreSQL → API propia → PWA.  ↔ R5
- [ ] (T6) Sprint 0 no implementa autenticación, fantasy, mercado ni llamadas reales a FAB.  ↔ R6
- [ ] Tests que cubran los criterios de aceptación
