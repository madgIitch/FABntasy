# Runner de datos sintéticos 14F

El runner de Sprint 14F prepara escenarios reproducibles sin inferir nunca una base desde `DATABASE_URL`.

## Catálogo y validación

```powershell
pnpm test:data:list
pnpm test:data:validate
pnpm test:data:unit
```

Estas operaciones no conectan con PostgreSQL.

## Preflight de un run

Las futuras operaciones con datos utilizarán exclusivamente `TEST_DATABASE_URL` y requieren la confirmación explícita `CANASTIO_TEST_DATABASE=1`.

```powershell
$env:CANASTIO_TEST_DATABASE = "1"
$env:TEST_DATABASE_URL = "postgresql://user:password@localhost/canastio_test"
node scripts/test-data.mjs preflight `
  --scenario market.operations `
  --profile small `
  --seed 1406 `
  --clock 2026-10-02T18:00:00+02:00 `
  --run-id run_1406_market
```

El preflight valida el catálogo, los parámetros, la compatibilidad del escenario con el perfil y el destino. Solo emite un manifiesto saneado; no muestra credenciales ni modifica la base.

## Guardas

- No existe fallback a `DATABASE_URL`.
- `CANASTIO_TEST_DATABASE` debe ser exactamente `1`.
- El destino debe ser local o contener `test`/`dev` en host o base.
- `run_id` solo admite minúsculas, números, guion y guion bajo, con longitud de 6 a 64.
- `clock` debe ser ISO-8601 con zona explícita.
- `seed` debe ser un entero seguro.

Los comandos de foundation, escenarios, assertions y teardown se incorporarán sobre este contrato. Ninguno podrá relajar estas guardas.
