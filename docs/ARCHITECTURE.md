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

- **data_model:** La fundación solo crea el esqueleto de Prisma y una migración inicial vacía; no modela entidades deportivas.
- **external_contracts:** Sprint 0 no realiza llamadas reales a FAB; solo deja interfaces/configuración preparada para el Sprint 1.
- **edge_cases:** La configuración debe validar variables ausentes y separar entorno cliente de servidor sin exponer secretos.
- **ui_states:** La PWA solo necesita un shell mínimo arrancable, sin flujos de producto ni datos simulados de fantasy.

