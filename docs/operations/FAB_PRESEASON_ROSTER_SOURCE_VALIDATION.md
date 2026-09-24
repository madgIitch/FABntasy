# Validación de la fuente FAB de plantillas (24/09/2026)

Esta investigación es la condición de entrada de la spec aprobada [FANTASY_PRESEASON_REGISTRATIONS_SPEC.md](FANTASY_PRESEASON_REGISTRATIONS_SPEC.md). Todas las consultas fueron de lectura a la API usada por Afición FAB; se registró un dispositivo temporal en memoria y no se guardaron sus credenciales ni nombres de jugadores.

## Contrato observado

1. Resolver la competición mediante `POST /v2/busqueda.ashx`, `accion=buscarCategoria`, y verificar `IdCompeticionCategoria` (9955 o 10027). `Id` es un handle opaco ligado al dispositivo.
2. Consultar `POST /v2/categoria.ashx`, `accion=fasesGrupos`, `id_categoria_competicion=<handle>`; luego `accion=equipos` por fase y grupo. `IdEquipoNotificacion` es el identificador de equipo que se conserva entre dispositivos; `Id` es el handle de consulta.
3. Consultar `POST /v2/equipo.ashx` con `accion=jugadores`, `id_equipo=<handle>` para cada equipo. Una respuesta válida tiene `resultado=correcto` y `misjugadores` como lista. La respuesta no contiene indicador de snapshot completo, fecha de publicación ni paginación. Cada fila incluye `Id`, `IdCategoria`, `IdCategoriaCompeticion`, `IdClub`, `Nombre`, `NombreEquipo`, `Temporada` y estadísticas agregadas; **no incluye un ID numérico de jugador**. No se debe tratar una lista vacía como prueba de que el equipo carece de jugadores.
4. `POST /v2/jugador.ashx`, `accion=detalleJugador`, `id_jugador=<Id>`, devuelve el mismo objeto `jugador`, un objeto `equipo` con `IdEquipoNotificacion` y `idComponenteClub`. Este último también es un handle opaco ligado al dispositivo.

Las llamadas requieren credenciales de dispositivo FAB. El cliente actual impone 250 ms mínimos entre llamadas y aplica sus mecanismos de retry/backoff; una implementación futura debe conservar esa disciplina. Las respuestas RAW incluyen `id_dispositivo` y `key`, por lo que no deben almacenarse sin saneamiento. `accion=jugadores` entrega una sola lista, sin parámetros de página observados; no hay contrato que certifique si la lista es exhaustiva.

## Evidencia saneada

| Competición | Equipos consultados | Equipos con lista no vacía | Jugadores observados | Errores de respuesta |
|---|---:|---:|---:|---:|
| 9955 · 1ª Senior Provincial Masculina, Sevilla | 21 | 0 | 0 | 0 |
| 10027 · Liga Nacional N1 Masculina | 48 | 16 | 167 | 0 |

En 10027, un equipo con `IdEquipoNotificacion=119626` devolvió 8 jugadores con `PartidosJugados=0`. Se consultó de nuevo con un segundo dispositivo: se mantuvieron el ID estable de competición (10027), el ID estable de equipo (119626), el orden y los ocho nombres, pero **los ocho `Id` de jugador cambiaron**. `idComponenteClub` también cambió entre dispositivos en una comprobación separada. Este ejemplo demuestra que FAB publica parte de la plantilla antes del primer partido, pero los campos de jugador disponibles no sirven como clave canónica entre dispositivos.

Un smoke de solo lectura del parser de Sprint 37 volvió a recorrer 10027: 48 equipos, 16 con jugadores, 167 fichas aceptadas por el contrato de equipo/categoría/temporada, 32 equipos sin fichas y 0 filas ambiguas. El smoke sustituyó las escrituras por un repositorio en memoria; no activó fantasy ni alteró PostgreSQL.

Los tests de conciliación se ejecutaron sobre un PostgreSQL temporal con el esquema deportivo y la migración nueva: ficha antes de boxscore y boxscore antes de ficha conservan un único UUID; dos dispositivos conservan el equipo por `IdEquipoNotificacion`; un traspaso conserva el `Player` y crea una inscripción nueva sin borrar la anterior. El entorno local no incluye los esquemas `auth` y `storage` de Supabase, así que no se ejecutó allí la cadena completa de migraciones del producto; `prisma validate` y todos los gates del harness sí pasaron.

Forma saneada de una fila observada:

```json
{
  "Id": "<handle de jugador distinto por dispositivo>",
  "IdCategoriaCompeticion": "<handle de competición distinto por dispositivo>",
  "Nombre": "<omitido>",
  "NombreEquipo": "<omitido>",
  "Temporada": "Temporada 2026/2027",
  "PartidosJugados": 0
}
```

## Resultado de la condición de entrada

**PLANTILLA_NO_DISPONIBLE para 9955.** FAB devuelve listas vacías para todos sus equipos y no proporciona señal de que ese vacío sea definitivo. Para 10027 hay jugadores publicados, pero falta una clave de jugador estable compartida o conciliable con `componente_id` de boxscores. No es seguro utilizar los handles como identidad persistente: se duplicarían al renovar el dispositivo.

La revisión aprobada de Sprint 37 permite almacenar fichas publicadas con identidad provisional y conciliar con boxscores mediante nombre y apellidos normalizados **solo si hay una coincidencia única en equipo, competición y temporada**, marcada `TENTATIVE`. Un ID compartido se adoptará como identidad verificada cuando se contraste sobre el mismo jugador real. Ninguna coincidencia ambigua se fusiona automáticamente. No se ha probado que las listas vacías de 9955 signifiquen que FAB no publicará jugadores más adelante.
