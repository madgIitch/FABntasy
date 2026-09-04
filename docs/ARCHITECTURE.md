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

<!-- harness:sprint-1-fab-client -->
## sprint-1-fab-client · Sprint 1 - FAB Client



### Scope aprobado

  - `services/fab_ingestor/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** Las credenciales se abstraen tras un almacén server-side con sustitución atómica; las respuestas RAW son opcionales y deben quedar anonimizadas.
- **external_contracts:** El cliente usa POST form-urlencoded contra /dispositivo.ashx y /v2/busqueda.ashx según los contratos FAB ya confirmados.
- **edge_cases:** La paginación avanza secuencialmente mediante skip, termina ante página vacía o incompleta y evita concurrencia sobre el mismo recurso.
- **ui_states:** La feature no incorpora interfaz de usuario; expone un cliente Python reemplazable para el ingestor.

