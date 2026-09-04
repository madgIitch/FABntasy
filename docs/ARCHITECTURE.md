# Arquitectura

> El agente lo lee antes de implementar. Mantén aquí el contexto que no cabe en una feature concreta.

## Visión general

Producto/proyecto:

Usuarios principales:

Objetivo no negociable:

## Componentes

- (rellenar) Componente:
  - Responsabilidad:
  - Entradas/salidas:
  - Dueño/riesgo:

## Flujo de datos

1. (rellenar)

## Integraciones externas

- Supabase:
  - Responsabilidad: PostgreSQL gestionado para datos deportivos, fantasy y auditoría.
  - Contrato: `DATABASE_URL` server-side; Prisma accede a la base de datos.
  - Credenciales/config: variables de entorno; nunca se exponen en el bundle del navegador.
  - Entorno local/CI: Supabase remoto para entornos compartidos; tests deben poder ejecutarse sin red mediante mocks o base efímera.

- (rellenar) Servicio/API:
  - Contrato:
  - Credenciales/config:
  - Entorno local/CI:

## Restricciones conocidas

- (rellenar) Rendimiento, seguridad, compatibilidad, despliegue, coste, etc.

## Decisiones abiertas

- (rellenar) Preguntas que bloquean diseño futuro.

<!-- Los specs aprobados se anexan debajo con marcadores harness:<id>. -->

<!-- harness:sprint-0-project-foundation -->
## sprint-0-project-foundation · Sprint 0 - Project Foundation



### Scope aprobado

  - `apps/web/**`
  - `services/fab_ingestor/**`
  - `packages/**`
  - `prisma/**`
  - `tests/**`
  - `.github/workflows/**`
  - `.env.example`
  - `docs/**`
  - `spec.json`

### Contexto técnico

- **data_model:** La fundación mantiene separados web, ingestor, paquetes compartidos y Prisma; la migración inicial no introduce dominio fantasy.
- **external_contracts:** Los entrypoints son apps/web y services/fab_ingestor; el ingestor mock no llama a FAB.
- **edge_cases:** La configuración ausente, el modo mock y la ejecución desde CI quedan cubiertos por defaults seguros y tests.
- **ui_states:** La PWA entrega únicamente un shell mínimo con estados de arranque y error básicos, sin funcionalidades de producto.
