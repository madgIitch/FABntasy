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

<!-- harness:sprint-1-fab-client -->
## sprint-1-fab-client · Sprint 1 - FAB Client



### Scope aprobado

  - `services/fab_ingestor/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** El cliente devuelve modelos tipados de dispositivo, partidos, categorías y equipos sin acoplarse a Prisma.
- **external_contracts:** Las búsquedas usan exclusivamente POST form-urlencoded contra `/v2/busqueda.ashx`; el registro usa `/dispositivo.ashx`.
- **edge_cases:** La paginación usa `skip`, termina con la respuesta corta o el total y evita páginas concurrentes.
- **ui_states:** No aplica: el cliente no expone UI ni se consume directamente desde el navegador.

