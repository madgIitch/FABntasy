# Decisiones (ADR)

Formato por entrada: **fecha · título** — contexto, decisión y consecuencias.
El harness añade entradas cuando se aprueba un spec; el agente también debe añadir entradas cuando toma
una decisión de arquitectura relevante durante implementación.

## Pendientes de decisión

- (rellenar) Decisiones que aún no deben asumirse automáticamente.

<!-- Nuevas entradas debajo -->

## 2026-09-04 · PostgreSQL gestionado en Supabase

Contexto: el proyecto necesita PostgreSQL y Prisma sin asumir operación directa de la base de datos.

Decisión: usar Supabase como proveedor de PostgreSQL gestionado. Prisma seguirá siendo la capa ORM y `DATABASE_URL` será server-side.

Consecuencia: las migraciones seguirán versionadas en `prisma/`; los tests no dependerán de una instancia remota de Supabase.

<!-- harness:sprint-0-project-foundation -->
## 2026-09-04 · sprint-0-project-foundation aprobado

Contexto: se aprobó el spec `sprint-0-project-foundation` (Sprint 0 - Project Foundation).

Decisiones registradas:

- **auth_secrets:** Las credenciales FAB y secretos son exclusivamente server-side; ninguna variable sensible usa NEXT_PUBLIC_.
- **rollback_compat:** La base inicial es reversible en desarrollo y no bloquea futuras migraciones del modelo deportivo.
- **tests:** Los gates obligatorios cubren TypeScript, lint, Vitest, pytest y Prisma validate.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.

<!-- harness:sprint-1-fab-client -->
## 2026-09-04 · sprint-1-fab-client aprobado

Contexto: se aprobó el spec `sprint-1-fab-client` (Sprint 1 - FAB Client).

Decisiones registradas:

- **auth_secrets:** `id_dispositivo` y `key` solo viven en configuración server-side y nunca aparecen en logs o excepciones.
- **rollback_compat:** `FabClient` es una frontera reemplazable y el modo mock permite operar sin red.
- **tests:** Fixtures y mocks cubren registro, rotación, paginación, timeout y errores sin red real.

Consecuencia: futuras features deben respetar este contrato salvo nuevo ADR.
