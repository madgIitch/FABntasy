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
