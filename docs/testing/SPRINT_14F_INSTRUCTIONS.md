# Sprint 14F — Instrucciones de uso

Esta guía explica cómo ejecutar la suite de simulación productiva de Canastio. Los comandos que modifican PostgreSQL nunca usan `DATABASE_URL` de forma implícita.

## 1. Requisitos

- Dependencias del monorepo instaladas.
- Esquema Prisma migrado en una base PostgreSQL desechable.
- Una URL cuyo host o nombre contenga `test`/`dev`, o una base local.
- Nunca utilizar una base compartida, staging con usuarios reales o producción.

## 2. Variables obligatorias

PowerShell:

```powershell
$env:CANASTIO_TEST_DATABASE = "1"
$env:TEST_DATABASE_URL = "postgresql://canastio:canastio@localhost:55432/canastio_test?schema=public"
```

Para exigir que los gates de integración fallen en vez de saltarse cuando falta PostgreSQL:

```powershell
$env:CANASTIO_REQUIRE_TEST_DB = "1"
```

La suite rechaza el destino antes de renderizar o ejecutar SQL si estas guardas no se cumplen.

## 3. Preparar el esquema

En PostgreSQL genérico, crea primero el contrato mínimo que las migraciones esperan de Supabase:

```powershell
node scripts/test-data.mjs bootstrap --scenario onboarding.no-league --profile small --seed 1406 --clock 2026-10-02T18:00:00+02:00 --run-id bootstrap_14f
```

Después aplica las migraciones usando la URL de test también como URL directa:

```powershell
$env:DATABASE_URL = $env:TEST_DATABASE_URL
$env:DIRECT_URL = $env:TEST_DATABASE_URL
corepack pnpm exec prisma migrate deploy
```

Hazlo solo después de verificar visualmente el nombre de la base.

## 4. Consultar el catálogo

```powershell
pnpm test:data:list
pnpm test:data:validate
pnpm test:data:unit
```

El catálogo contiene 15 escenarios, 12 checkpoints T0–T11, 10 rechazos de dominio y seis carreras concurrentes.

## 5. Ejecutar un escenario

Todos los parámetros son explícitos:

```powershell
node scripts/test-data.mjs run `
  --scenario market.operations `
  --profile small `
  --seed 1406 `
  --clock 2026-10-02T18:00:00+02:00 `
  --run-id run_1406_market
```

`run` ejecuta foundation deportiva, foundation fantasy, overlay del escenario y las assertions de deporte, economía y dominio.

Escenarios especialmente útiles:

- `onboarding.no-league`: perfil sintético sin membresía.
- `market.empty-roster`: mercado abierto y 100 M.
- `market.partial-roster`: dos compras de 5 M y saldo esperado de 90 M.
- `lineup.draft`: cuatro titulares, todavía no válido para congelar.
- `lineup.locked`: cinco titulares y dos suplentes.
- `round.live`: primera jornada en estado live y boxscores sintéticos.
- `round.published`: puntuación derivada de los cinco titulares.
- `round.corrected`: dos revisiones, una supersedida y otra vigente.
- `pricing.history`: precio actual reconciliado con su evento.
- `account.multi-league`: dos equipos del mismo usuario aislados por liga.

## 6. Reejecutar y comprobar idempotencia

Ejecuta dos veces exactamente el mismo comando y después:

```powershell
node scripts/test-data.mjs assert `
  --scenario market.partial-roster `
  --profile small `
  --seed 1406 `
  --clock 2026-10-02T18:00:00+02:00 `
  --run-id run_1406_market
```

No deben aumentar membresías, equipos, compras, ledger, roster ni precios.

## 7. Diagnóstico

Los SQL de `seeding/diagnostics/` son de solo lectura. Renderiza `{{run_id}}` con el mismo literal utilizado por el runner antes de ejecutarlos. Incluyen:

- `economy.sql`: saldo, total del ledger, coste y tamaño del roster.
- `ownership.sql`: propietario y precio de adquisición por jugador.

Las assertions fallan con un mensaje que identifica la familia afectada. No guardes dumps completos si contienen datos ajenos al run.

## 8. Limpiar el run

```powershell
node scripts/test-data.mjs teardown `
  --scenario market.operations `
  --profile small `
  --seed 1406 `
  --clock 2026-10-02T18:00:00+02:00 `
  --run-id run_1406_market
```

El teardown sigue el orden de claves foráneas y comprueba la identidad determinista de la liga y federación. Nunca acepta un glob, un prefijo incompleto ni un identificador calculado desde el entorno.

## 9. Gates del harness

Los gates añadidos son:

```text
seed-manifest-validate
seed-runner-unit
seed-small-smoke
seed-idempotency
seed-assertions
seed-realistic-cycle
seed-teardown-isolation
```

Sin `TEST_DATABASE_URL`, los gates PostgreSQL muestran `SKIP`. En el job de integración debe establecerse `CANASTIO_REQUIRE_TEST_DB=1` para convertir la ausencia de base en fallo bloqueante.

Ejecutar individualmente:

```powershell
node scripts/test-data-gate.mjs small-smoke
node scripts/test-data-gate.mjs idempotency
node scripts/test-data-gate.mjs assertions
node scripts/test-data-gate.mjs realistic-cycle
node scripts/test-data-gate.mjs teardown-isolation
```

## 10. Flujo recomendado del harness

1. Working tree limpio y preflight.
2. Validación del manifiesto.
3. Migraciones en PostgreSQL de test.
4. `small-smoke`.
5. Reejecución idempotente.
6. Assertions de dominio.
7. Ciclo `realistic` con 12 clubes, 120 jugadores y 20 managers.
8. Teardown y comprobación de aislamiento.
9. Typecheck, lint, tests web, pytest, ruff y Prisma validate.
10. Conservar solo manifiestos y diagnósticos saneados.

## 11. Límites

La suite reproduce persistencia, calendario, economía, roster, alineación, estados de jornada, publicación, corrección, precios y aislamiento de liga. Las carreras concurrentes reales deben ejecutarse contra las APIs de dominio en un entorno con sesiones sintéticas; no deben simularse mediante inserts paralelos. FAB permanece mockeado y no se realizan peticiones de red.
