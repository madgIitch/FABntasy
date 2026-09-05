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

<!-- harness:sprint-2-sports-data-model -->
## sprint-2-sports-data-model · Sprint 2 - Sports Data Model



### Scope aprobado

  - `prisma/**`
  - `apps/web/src/server/**`
  - `services/fab_ingestor/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** Prisma define UUID internos y relaciones normalizadas para federación, competición, temporada, edición, grupo, jornada, equipo, inscripción, jugador, inscripción, partido, estadísticas, identificadores externos y payloads RAW. Los repositorios Python realizan UPSERT sobre claves naturales documentadas.
- **external_contracts:** `external_ids` usa `source`, `entity_type`, `external_id` y `entity_id`; conserva IDs opacos como texto y establece unicidad por fuente, tipo e ID externo. Prisma gobierna migraciones y Python escribe directamente en PostgreSQL.
- **edge_cases:** Los campos aún no publicados por FAB son nullable; un jugador sin identificador estable puede conservar identidad provisional por fuente y contexto, sin fusionarse por nombre; partidos reprogramados actualizan el mismo registro.
- **ui_states:** No hay UI en este sprint; las consultas de servidor solo exponen datos deportivos normalizados y nunca payloads RAW por defecto.

<!-- harness:sprint-3-active-competition-discovery -->
## sprint-3-active-competition-discovery · Sprint 3 - Active Competition Discovery



### Scope aprobado

  - `services/fab_ingestor/**`
  - `prisma/**`
  - `apps/web/src/server/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** La categoría FAB seleccionada se representa como Competition + CompetitionSeason y conserva `Id`, `IdCompeticionCategoria`, categoría, competición y delegación mediante external IDs y metadatos normalizados. Se añade una marca primaria protegida por índice único parcial.
- **external_contracts:** Discovery usa exclusivamente `buscarCategoria`. La APK confirma que la enumeración exhaustiva parte de `/v2/categoria.ashx`: `accion=fasesGrupos` usa `id_categoria_competicion`, y `accion=equipos` usa `id_fase`, `id_grupo`, `jornada`, `tipo_fase` y `ventana`. Ambos contratos se validaron también contra Copa Delegación real.
- **edge_cases:** El nombre no determina temporada ni identidad; los IDs opacos permanecen texto; repetir selección/sync es idempotente; `DESCANSA` se descarta como marcador de calendario; si un equipo aparece en más de un grupo/fase, su TeamRegistration no recibe un grupo ambiguo.
- **ui_states:** La administración inicial es CLI: listado de candidatos, selección explícita por `IdCompeticionCategoria` y resumen de sync; no se implementa UI web en este sprint.

<!-- harness:sprint-4-schedule-and-games-ingestion -->
## sprint-4-schedule-and-games-ingestion · Sprint 4 - Schedule and Games Ingestion



### Scope aprobado

  - `services/fab_ingestor/**`
  - `prisma/**`
  - `tests/**`
  - `docs/**`
  - `.env.example`
  - `spec.json`

### Contexto técnico

- **data_model:** Game conserva el ID FAB estable, equipos, fase/grupo/ronda, jornada, horario con zona Europe/Madrid, estado y resultado. Se añade un estado de sincronización para distinguir registros presentes y stale sin borrarlos.
- **external_contracts:** La APK confirma `/v2/categoria.ashx`: `Jornadas` y `horariosJornadas` usan `id_categoria_competicion`, `id_fase`, `id_grupo`, `id_ronda`, `fecha_inicial` y `fecha_final`. Se validarán respuestas reales de Copa Delegación antes de normalizar.
- **edge_cases:** `DESCANSA` no crea partidos; aplazamientos y cambios de hora actualizan el mismo Game por ID FAB; valores o equipos no resolubles bloquean ese recorrido sin fusionar por nombre.
- **ui_states:** La operación del sprint es CLI (`sync-competition-games`); no se añade interfaz web.

