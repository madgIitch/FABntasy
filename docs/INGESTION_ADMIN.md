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
