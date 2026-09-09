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

## 12. Usuarios Supabase para pruebas visuales

Para poder iniciar sesión y navegar por los escenarios, crea **21 usuarios de QA** mediante Supabase Auth. Este número cubre el perfil `realistic`: el usuario `00` queda reservado para probar onboarding sin liga y los usuarios `01`–`20` representan managers de liga.

No insertes las filas manualmente en `auth.users` ni uses **Authentication → Users → Add user**: ese modal no permite enviar `raw_user_meta_data.username` y el trigger de Canastio rechaza correctamente la creación con `invalid_username`. Usa una de estas vías:

1. **Recomendada para empezar:** registra cada cuenta desde `/registro`, porque el formulario de Canastio envía `{ username }` a Supabase Auth.
2. **Recomendada para automatizar:** Admin Auth API con `user_metadata: { username: "qa_manager_XX" }` y `email_confirm: true`, ejecutada solo desde un entorno local seguro.

Con `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el `.env` local, el provisionador incluido crea o actualiza las 21 cuentas en cadena:

```powershell
npm run test:data:provision-users
```

La contraseña compartida y el mapa de UUID quedan en `.local/qa-users.json`, que está ignorado por Git. El comando no imprime secretos y es idempotente: una segunda ejecución actualiza las mismas cuentas en lugar de duplicarlas.

Una vez configurada una `TEST_DATABASE_URL` directa al PostgreSQL del mismo proyecto Supabase, carga el escenario usando esos perfiles reales:

```powershell
$env:CANASTIO_TEST_DATABASE = "1"
node scripts/test-data.mjs run `
  --scenario round.live `
  --profile small `
  --seed 1406 `
  --clock 2026-10-02T18:00:00+02:00 `
  --run-id visual_round_live `
  --identity-map .local/qa-users.json
```

El runner comprueba que el mapa contiene suficientes slots y que cada UUID ya tiene un `user_profiles` creado por el trigger. El teardown elimina liga, equipos y fixtures del run, pero conserva los usuarios y perfiles Supabase para reutilizarlos en el siguiente escenario.

Los dominios `example.com` de la tabla son identificadores ilustrativos, no buzones utilizables para confirmar el correo. Si registras desde la app, usa alias que lleguen a una bandeja real; por ejemplo, `tuusuario+canastio.qa.00@gmail.com`. Utiliza contraseñas exclusivas de QA, nunca credenciales personales o de producción.

| Cuenta lógica | Correo recomendado | Username | Uso |
|---|---|---|---|
| qa-00 | `canastio.qa.00@example.com` | `qa_manager_00` | Usuario sin liga / onboarding |
| qa-01 | `canastio.qa.01@example.com` | `qa_manager_01` | Propietario y administrador de liga |
| qa-02 | `canastio.qa.02@example.com` | `qa_manager_02` | Manager miembro |
| qa-03 | `canastio.qa.03@example.com` | `qa_manager_03` | Manager miembro |
| qa-04 | `canastio.qa.04@example.com` | `qa_manager_04` | Manager miembro |
| qa-05 | `canastio.qa.05@example.com` | `qa_manager_05` | Manager miembro |
| qa-06 | `canastio.qa.06@example.com` | `qa_manager_06` | Manager miembro |
| qa-07 | `canastio.qa.07@example.com` | `qa_manager_07` | Manager miembro |
| qa-08 | `canastio.qa.08@example.com` | `qa_manager_08` | Manager miembro |
| qa-09 | `canastio.qa.09@example.com` | `qa_manager_09` | Manager miembro |
| qa-10 | `canastio.qa.10@example.com` | `qa_manager_10` | Manager miembro |
| qa-11 | `canastio.qa.11@example.com` | `qa_manager_11` | Manager miembro |
| qa-12 | `canastio.qa.12@example.com` | `qa_manager_12` | Manager miembro |
| qa-13 | `canastio.qa.13@example.com` | `qa_manager_13` | Manager miembro |
| qa-14 | `canastio.qa.14@example.com` | `qa_manager_14` | Manager miembro |
| qa-15 | `canastio.qa.15@example.com` | `qa_manager_15` | Manager miembro |
| qa-16 | `canastio.qa.16@example.com` | `qa_manager_16` | Manager miembro |
| qa-17 | `canastio.qa.17@example.com` | `qa_manager_17` | Manager miembro |
| qa-18 | `canastio.qa.18@example.com` | `qa_manager_18` | Manager miembro |
| qa-19 | `canastio.qa.19@example.com` | `qa_manager_19` | Manager miembro |
| qa-20 | `canastio.qa.20@example.com` | `qa_manager_20` | Manager miembro |

Para el perfil `small` solo son necesarias `qa-00`, `qa-01`, `qa-02` y `qa-03`. Conviene crear las 21 una sola vez para que los tres perfiles compartan un catálogo estable.

### Datos que debes devolver para enlazarlos

Cuando estén creados, exporta o copia exclusivamente estas columnas de cada usuario:

```text
id,email,created_at,email_confirmed_at,raw_user_meta_data
```

El dato imprescindible es `id`, el UUID real asignado por Supabase Auth. No envíes `encrypted_password`, tokens, claves de servicio, cookies, refresh tokens ni la contraseña elegida. Si `raw_user_meta_data` no contiene el username no pasa nada: el adaptador lo escribirá en `user_profiles` usando la tabla anterior.

Formato ideal para pasármelo:

```csv
slot,auth_user_id,email,username
00,UUID_DE_SUPABASE,canastio.qa.00@example.com,qa_manager_00
01,UUID_DE_SUPABASE,canastio.qa.01@example.com,qa_manager_01
```

### Preparación adicional

1. Crea los usuarios en el mismo proyecto Supabase al que apunta la aplicación que abrirás en el navegador, mediante `/registro` o la Admin Auth API con metadata `username`.
2. Comprueba que puedes iniciar sesión al menos con `qa-00` y `qa-01` antes de cargar escenarios.
3. Conserva las contraseñas en un gestor local o archivo ignorado por Git; no deben añadirse al repositorio.
4. Confirma que las migraciones de Canastio están aplicadas en ese proyecto.
5. Obtén los UUID y prepara el CSV anterior.
6. Configura `TEST_DATABASE_URL` con la conexión PostgreSQL directa o Session Pooler del proyecto y verifica cuidadosamente que es el proyecto de pruebas.
7. Ejecuta `run` con `--identity-map .local/qa-users.json`; la web deberá usar ese mismo Supabase.
8. Inicia sesión con `qa_manager_00` para onboarding o `qa_manager_01` para el propietario del escenario y navega por la app.

El futuro mapa de identidades mantendrá una asociación estable: slot `00` sin liga, slot `01` propietario y slots `02`–`20` miembros. Así, un mismo login representará el mismo manager en todos los escenarios visuales.
