# Decisiones (ADR)

Formato por entrada: **fecha · título** — contexto, decisión y consecuencias.
El harness añade entradas cuando se aprueba un spec; el agente también debe añadir entradas cuando toma
una decisión de arquitectura relevante durante implementación.

## Pendientes de decisión

- (rellenar) Decisiones que aún no deben asumirse automáticamente.

<!-- Nuevas entradas debajo -->

<!-- harness:sprint-0-project-foundation -->
## 2026-09-04 · sprint-0-project-foundation aprobado

Contexto: se aprobó el spec `sprint-0-project-foundation` (Sprint 0 - Project Foundation).

Decisiones registradas:

- **auth_secrets:** FAB_DEVICE, FAB_KEY, SECRET, PASSWORD y TOKEN son siempre server-side; ninguna variable sensible usa NEXT_PUBLIC_.
- **rollback_compat:** La migración inicial es vacía y la estructura permite continuar sin autenticación, fantasy ni mercado.
- **tests:** Se cubren los comandos de TypeScript, lint, tests, pytest y validación Prisma definidos por el spec.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-1-fab-client -->
## 2026-09-04 · sprint-1-fab-client aprobado

Contexto: se aprobó el spec `sprint-1-fab-client` (Sprint 1 - FAB Client).

Decisiones registradas:

- **auth_secrets:** id_dispositivo y key nunca se registran, incluyen en excepciones ni se exponen mediante variables públicas.
- **rollback_compat:** El cliente queda aislado detrás de FabClient y no modifica el modelo deportivo ni introduce llamadas FAB desde la PWA.
- **tests:** Fixtures anonimizadas y transporte simulado cubren registro, rotación, paginación, timeout, reintentos y errores sin red real.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-2-sports-data-model -->
## 2026-09-04 · sprint-2-sports-data-model aprobado

Contexto: se aprobó el spec `sprint-2-sports-data-model` (Sprint 2 - Sports Data Model).

Decisiones registradas:

- **auth_secrets:** `raw_fab_payloads.payload` se sanea antes de persistir y rechaza claves sensibles (`key`, `id_dispositivo`, token, password, secret); la base no almacena credenciales FAB en tablas deportivas.
- **rollback_compat:** La migración solo añade tablas deportivas, es reversible en desarrollo y no modifica el contrato del `FabClient` ni introduce tablas fantasy.
- **tests:** Se prueban esquema, constraints y UPSERT con PostgreSQL real de test; además hay tests unitarios de saneado y mapeo. `prisma validate`, Python y gates existentes deben pasar.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.
