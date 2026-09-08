# Propuesta futura — Feed de actividad de liga

Estado: propuesta sin aprobar (`spec_approved: false`). Este documento no autoriza cambios de base de datos, generación retroactiva de eventos ni notificaciones.

## Objetivo

Convertir **Liga → Actividad** en una cronología verificable de los movimientos relevantes de una liga privada. La pantalla debe responder a «qué ha ocurrido desde mi última visita» sin convertirse en un dashboard ni duplicar Mercado, Jornada o Clasificación.

## Modelo visual 14D

- Una única superficie continua, agrupada por `Hoy`, `Ayer` y fecha.
- Una fila por evento, separada por divisores; nunca una tarjeta por evento.
- Mini-identidad del manager cuando exista actor, texto de evento, magnitud principal y timestamp.
- Verde para acciones/estado positivo; los cambios negativos incluyen símbolo y texto, no dependen solo del color.
- Sin filtros en v1. El orden es cronológico descendente y estable.

## Taxonomía inicial

| Tipo | Sintaxis de producto | Magnitud |
| --- | --- | --- |
| `PLAYER_BOUGHT` | `{manager} fichó a {player}` | precio |
| `PLAYER_SOLD` | `{manager} vendió a {player}` | precio |
| `CLAUSE_EXECUTED` | `{manager} ejecutó la cláusula de {player}` | importe |
| `PLAYER_PROTECTED` | `{manager} blindó a {player}` | duración |
| `PRICE_CHANGED` | `{player} sube/baja de {old} a {new}` | variación |
| `MEMBER_JOINED` | `{manager} se unió a la liga` | — |
| `ROUND_PUBLISHED` | `Jornada {round} publicada` | — |
| `RANK_CHANGED` | `{manager} sube/baja al {position}` | puestos |

Los eventos editoriales («Clausulazo», «Se mueve la Bolsa») se reservan para hitos relevantes y no sustituyen la descripción literal.

## Contrato funcional futuro

- Cada evento requiere `id`, `leagueId`, `type`, `occurredAt`, actor opcional, entidad afectada, payload versionado y referencia a la operación fuente.
- La API devuelve cursor opaco, eventos ordenados y solo datos visibles para miembros activos de la liga.
- Los importes se guardan como enteros de créditos; la UI formatea, nunca recalcula una operación histórica.
- La creación del evento y la operación de negocio deben compartir transacción o un outbox duradero para evitar noticias fantasma.
- No se inventan eventos históricos si no pueden reconstruirse de forma determinista.
- Timestamps relativos en el primer día y fecha/hora absoluta después; zona horaria de presentación: `Europe/Madrid`.

## Estados

- Vacío: explicación neutra y CTA `Invitar managers`; nunca «Próximamente».
- Cargando: tres filas esqueleto compactas dentro del área del feed.
- Error: conserva los últimos eventos disponibles y comunica que no se pudo actualizar.
- Paginación: carga incremental al acercarse al final, conservando posición de scroll.

## Accesibilidad y QA futuro

- El feed usa lista semántica y cada evento puede entenderse sin icono ni color.
- Los enlaces a manager/jugador tienen objetivo táctil mínimo de 44 px.
- Pruebas de autorización entre ligas, orden estable, idempotencia del outbox, importes exactos y estados vacío/error/paginado.
- QA visual a 360, 390, 414 y 768 px, incluyendo nombres largos e importes de ocho cifras.

