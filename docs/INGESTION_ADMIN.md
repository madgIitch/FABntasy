# Administración de ingesta

Sprint 17 añade `/app/admin/ingestion`, una cola PostgreSQL y un worker Python. La petición web nunca ejecuta una ingesta dentro de Vercel: crea un job `QUEUED` y responde `202`.

## Puesta en marcha

1. Aplicar `prisma/migrations/20260911000200_ingestion_admin/migration.sql`.
2. Con `DATABASE_URL` apuntando al entorno correcto, conceder el primer rol usando el UUID de Supabase Auth:

```bash
uv run --directory services/fab_ingestor python -m fab_ingestor grant-ingestion-admin --auth-user-id <UUID>
```

No existe endpoint de autoconcesión. Revocar un administrador requiere establecer `revoked_at` mediante operación SQL controlada.

3. Ejecutar junto al scheduler el consumidor persistente:

```bash
uv run --directory services/fab_ingestor python -m fab_ingestor run-admin-worker
```

Para una prueba que procese como máximo un job:

```bash
uv run --directory services/fab_ingestor python -m fab_ingestor run-admin-worker --once
```

El worker actualiza `ingestion_heartbeats`, reclama con `FOR UPDATE SKIP LOCKED` y utiliza los locks de ingesta existentes. Si está apagado, el panel continúa disponible y los trabajos permanecen en cola.

## Seguridad y operación

- Toda página/API exige sesión y un grant `INGESTION_ADMIN` activo; la ausencia se presenta como 404.
- Los resync aceptan IDs opacos FAB con formato acotado. Competición y jornada usan `categoryId`; partido usa `gameId`.
- El RAW se lista solo como metadatos. El detalle se redacta recursivamente, se limita a 256 KiB y cada lectura queda auditada.
- Nunca registrar mensajes de excepción, cuerpos FAB, claves, cookies o cabeceras de autorización en jobs/auditoría.
- Un job `RUNNING` sin heartbeat durante 20 minutos aparece como `STALE`; requiere diagnóstico humano y no se relanza automáticamente.

## Índice de equipos de competiciones monitorizadas

Las tarjetas monitorizadas muestran un resumen y un índice desplegable calculado exclusivamente desde las relaciones normalizadas `TeamRegistration` y `PlayerRegistration` de su `CompetitionSeason`. “Inscripciones” significa filas de `PlayerRegistration`, no personas únicas entre equipos o temporadas. La lectura usa una agregación acotada para todas las competiciones, no llama a FAB, no crea jobs y no modifica el catálogo.

El estado de cobertura considera tanto las fases programadas de `ingestion_runs` como los jobs manuales `COMPETITION` de `ingestion_jobs`, ordenados por su finalización. Un éxito manual posterior a un fallo programado habilita el snapshot normalizado; un fallo posterior conserva el último snapshot válido y muestra `FAILED`. Los equipos pueden estar sincronizados aunque todavía haya cero inscripciones de jugadores.

El contrato `ingestion-admin.v1` expone `coverageStatus`, `calculatedAt`, `teamsLastSyncedAt`, `playersLastSyncedAt`, `teamCount`, `playerRegistrationCount` y filas con `teamId`, `teamName` y `playerRegistrationCount`. `NOT_SYNCED` y `FAILED` sin snapshot válido usan conteos `null`; un éxito confirmado sin equipos usa ceros. `PARTIAL`, `STALE` y un `FAILED` con datos anteriores conservan el último snapshot normalizado con advertencia. La frescura pasa a `STALE` 24 horas después del último run `competition` correcto.

`GET /api/admin/ingestion/team-index` exige `INGESTION_ADMIN` y mantiene el 404 opaco para actores no autorizados. No devuelve jugadores, PII, RAW, credenciales ni errores internos.

El rollback de interfaz se activa con `INGESTION_TEAM_INDEX_ENABLED=false`: oculta el índice y evita sus consultas sin eliminar equipos, inscripciones ni historial.

## Inscripciones de pretemporada (Sprint 37)

Aplicar la migración aditiva `20260924000100_preseason_player_identity` antes de desplegar el servidor web o el ingestor nuevos. La activación «Habilitar fantasy» exige una competición monitorizada y ya enlazada a `CompetitionSeason`, queda auditada con `INGESTION_ADMIN` y encola una sincronización `COMPETITION`; repetirla no crea un segundo trabajo activo. Si todavía no está enlazada, se debe usar primero «Sincronizar ahora» para crear sus equipos y calendario.

En competiciones habilitadas, la fase `roster` lee `equipo.ashx` (`accion=jugadores`) entre equipos y calendario, tanto en el scheduler como en la ejecución manual. El scheduler tiene intervalo inactivo de 60 a 180 minutos, inferior al objetivo de seis horas. El job manual actualiza su heartbeat mientras recorre equipos. Cada ficha se guarda con identidad `ROSTER_ONLY` hasta encontrar una boxscore; una coincidencia única de nombre normalizado dentro del equipo y temporada conserva el UUID y se marca `TENTATIVE`. Solo un ID común comprobado sobre el mismo jugador permitiría `VERIFIED`. Homónimos y contradicciones no se fusionan.

El panel separa `coverageStatus` de equipos y `rosterCoverageStatus` de fichas. `PLANTILLA_NO_DISPONIBLE` significa que FAB no devolvió jugadores de los equipos consultados, **no** que haya confirmado una plantilla definitiva de cero. Muestra fichas observadas, uniones tentativas, ambigüedades y última consulta válida sin exponer nombres en la API de índice. Los snapshots RAW de plantillas se reducen a los campos necesarios para auditar la identidad y excluyen credenciales y handles de dispositivo.

El despliegue puede revertir el código conservando las nuevas columnas, jugadores e inscripciones. La fase de boxscores anterior sigue aceptando sus IDs `component:*`.
