# Sprint 22C — Catálogo y monitorización de competiciones FAB

Estado: propuesta lista para aprobación. No autoriza implementación hasta que `spec_approved` sea `true`.

## Objetivo

La consola administrativa debe permitir observar cuándo FAB publica o modifica competiciones sin depender de búsquedas por nombres conocidos. El scheduler mantendrá un catálogo de todas las competiciones enumerables mediante el contrato FAB y una monitorización profunda separada para las competiciones que Canastio tenga fijadas.

El caso inicial incluye Primera Provincial de Sevilla y Liga Nacional N1 Masculina de Andalucía. La identidad se basará siempre en IDs FAB; nombres, categoría, delegación y alias serán metadatos mutables. Esto hace visible, sin fusionar datos incorrectamente, la discrepancia actual entre `categoryId=10468`, `category_name=LIGA NACIONAL N1 MAS` y el nombre interno `COPA DELEGACIÓN 2026`.

## Dos niveles de trabajo

### Descubrimiento global

Cada seis horas, con jitter y un lock exclusivo, el ingestor recorrerá todas las páginas que FAB permita enumerar sin aplicar filtros por nombre, delegación o selección fantasy. El recorrido será ligero: catálogo, IDs y metadatos descriptivos. No descargará automáticamente equipos, jornadas, partidos ni boxscores de cada resultado.

Cada ejecución conservará cursor/página, inicio y fin, número de páginas, elementos observados, altas, cambios, duplicados y error seguro. Solo un recorrido completo puede confirmar que una competición no apareció; una respuesta vacía o incompleta nunca autoriza a retirarla ni marcarla como desaparecida.

### Monitorización profunda

Las competiciones fijadas por un administrador o habilitadas para fantasy conservarán la cadencia adaptativa existente: reposo, proximidad de jornada, directo y reintentos finales. Para ellas se mostrarán equipos, jornadas, partidos, próximo evento, estados de estadísticas, último job y último error.

Fijar una competición no la habilita automáticamente para fantasy y no activa reglas de puntuación. Son decisiones independientes y auditadas.

## Identidad y cambios

El ID externo FAB será la clave canónica. El catálogo almacenará al menos:

- ID de catálogo y todos los IDs externos observados.
- Nombre FAB actual, categoría, delegación, temporada y sexo/nivel cuando estén disponibles.
- Alias operativo opcional.
- Primera observación, última comprobación y último cambio.
- Checksum normalizado de metadatos.
- Estado `DISCOVERED`, `UNCHANGED`, `CHANGED`, `STALE`, `PARTIAL` o `FAILED`.
- Estado monitorizado y relación opcional con `competition_seasons`.

Un mismo ID con texto nuevo es un cambio. Dos IDs con el mismo nombre siguen siendo entradas distintas. Las coincidencias de texto pueden generar una sugerencia administrativa, nunca una fusión automática.

## Consola administrativa

`/app/admin/ingestion` incorporará:

1. Resumen del último barrido global: estado, frescura, duración, páginas, total observado, altas y cambios.
2. Tarjetas de competiciones monitorizadas con nombres interno/FAB, alias, IDs, advertencias de identidad, cardinales deportivos, próximo partido y último resultado de ingesta.
3. Catálogo paginado con búsqueda y filtros por temporada, delegación y estado.
4. Acciones auditadas para fijar, desfijar y solicitar resincronización profunda.

La ruta seguirá protegida por `INGESTION_ADMIN`. Las vistas resumidas no incluirán credenciales, cabeceras, cookies ni payloads RAW.

## Carga, recuperación y seguridad

- El barrido reutilizará rate limiting, backoff, cancelación y circuit breaker existentes.
- Un cursor persistido permitirá continuar tras restart sin repetir eventos ya confirmados.
- Checksum y claves únicas harán idempotentes las observaciones y eventos.
- El lock impedirá dos barridos globales simultáneos.
- Los datos deportivos confirmados no se borrarán por fallos, vacíos o ausencias en un recorrido parcial.
- El operador podrá ver el error estable y reintentar sin consultar FAB desde el navegador.

## Criterios de aceptación

Los criterios normativos son los registrados en `spec.json` bajo `sprint-22c-fab-competition-monitoring`. Deben cubrir enumeración completa, identidad por ID, snapshots parciales, separación entre catálogo e ingesta profunda, consola, autorización, auditoría, idempotencia y pruebas de regresión.

## Rollback

La migración será aditiva. El rollback de aplicación desactiva el barrido y oculta la nueva sección, conservando catálogo e historial. No se eliminan tablas ni se revierten datos deportivos. El scheduler anterior continúa procesando únicamente las competiciones seleccionadas.

## Índice normalizado (Sprint 29)

La consola agrega los equipos monitorizados por `competition_season_id`, conserva cada `team_id` como fila independiente y cuenta las `PlayerRegistration` enlazadas a esa misma temporada y registro de equipo. La operación es exclusivamente PostgreSQL y de solo lectura. La cobertura se deriva del historial de las fases `competition` y `stats`: éxito reciente implica `COMPLETE`, más de 24 horas implica `STALE`, el estado parcial del catálogo implica `PARTIAL`, un último run fallido implica `FAILED` y la ausencia de un run o snapshot implica `NOT_SYNCED`.

El enlace entre catálogo y temporada usa exclusivamente `IdCompeticionCategoria` mediante `FAB_CATEGORY_COMPETITION`; el ID opaco de cada resultado de búsqueda puede variar y no define identidad. Solo puede existir una fila de catálogo por `category_competition_id`.

Si estadísticas devuelve exactamente `Id no válido`, el ingestor conserva el RAW saneado, incrementa `rejected` y continúa con los demás partidos. Tras tres rechazos persistidos para el mismo partido, lo marca `sync_status=stale` para que deje de bloquear ciclos posteriores. Ningún otro `FabResponseError` se silencia con esta regla.
