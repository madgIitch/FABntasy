# Sprint 14F — Simulación productiva y suite de escenarios SQL

Estado: propuesta lista para aprobación (`spec_approved: false`).

## Objetivo

Convertir los seeds actuales de desarrollo en una suite determinista, aislada y verificable capaz de reproducir con alta fidelidad el ciclo principal de Canastio: alta de usuario, creación o acceso a liga, construcción de plantilla desde el mercado, alineación, cierre y cálculo de jornada, publicación de ranking, evolución de precios y actividad de liga.

La suite debe permitir abrir la aplicación en un estado conocido, ejecutar transiciones reales y demostrar mediante invariantes que base de datos, servicios y UI describen el mismo sistema. No sustituye los tests unitarios, de contrato o E2E: les proporciona datos reproducibles.

## Situación de partida

La suite actual se ejecuta en tres scripts:

1. `seeder.sql` crea una competición, cuatro equipos y 40 jugadores.
2. `generate_random_games.sql` crea seis jornadas, 12 partidos y 240 boxscores.
3. `seed_fantasy.sql` completa equipos fantasy existentes, bloquea alineaciones, calcula puntos y rankings.

Es útil como demo, pero no modela una liga productiva completa:

- no crea identidades ni managers y depende de usuarios ya existentes;
- solo representa cuatro equipos reales y 40 jugadores;
- todos los partidos quedan terminados y las seis alineaciones bloqueadas;
- no permite detener el ciclo en estados abierto, en directo, provisional o corregido;
- las estadísticas pseudoaleatorias no garantizan distribuciones deportivas coherentes;
- el seed fantasy asigna adquisiciones de 3 M mientras el precio inicial de mercado es 5 M;
- no genera un historial económico y temporal representativo;
- no prueba concurrencia ni obliga a pasar por los servicios de dominio;
- la validación final es informativa, no un conjunto de assertions bloqueantes.

## Principios normativos

1. **Determinismo.** Mismos parámetros, reloj y semilla producen los mismos datos observables.
2. **Aislamiento.** Cada ejecución tiene `run_id` y solo puede modificar o limpiar datos de ese run.
3. **Fidelidad de dominio.** SQL prepara estados; las operaciones con reglas, permisos, locks o idempotencia pasan por los servicios/API reales.
4. **Transiciones antes que fotografías.** Un escenario puede avanzar por fases sin reconstruir toda la base.
5. **Assertions ejecutables.** Cada fase termina verificando invariantes y falla con código distinto de cero ante una violación.
6. **Datos sintéticos.** No se copian usuarios, credenciales, invitaciones ni payloads privados de producción.
7. **Sin red por defecto.** La suite usa fixtures/mocks y nunca llama a FAB salvo un modo operativo separado y explícito.
8. **Reejecución segura.** Setup, transición y teardown son idempotentes o rechazan claramente una fase incompatible.
9. **Trazabilidad.** Toda entidad sintética puede atribuirse a escenario, run, semilla y reloj lógico.
10. **Paridad verificable.** Presupuesto, ledger, roster, alineación, scoring, precios, ranking y feed deben reconciliarse entre sí.

## Alcance

- `seeding/**`
- `tests/**`
- `apps/web/src/server/**` solo para adaptadores o entrypoints de test sin alterar reglas productivas
- `services/fab_ingestor/tests/**`
- `scripts/**` para el runner local/CI
- `prisma/**` únicamente si hace falta persistencia aditiva de soporte; se prefiere metadata temporal o naming aislado
- `docs/**`
- `.harness/**` para gates y orquestación de la suite
- `package.json`
- `spec.json`

No incluye panel administrativo, PWA/offline, notificaciones, ingestión FAB en vivo, copia de producción, cambios de reglas fantasy ni generación de datos mediante la UI.

## Arquitectura de la suite

```text
seeding/
  foundation/
    sports.sql
    identities.sql
    fantasy.sql
  scenarios/
    onboarding/
    market/
    lineup/
    round/
    pricing/
    league/
    multi-league/
  transitions/
    open-market.sql
    close-lineups.sql
    start-round.sql
    import-partial-stats.sql
    finish-round.sql
    publish-round.sql
    reprice.sql
    correct-boxscore.sql
  assertions/
    sports.sql
    economy.sql
    roster.sql
    lineup.sql
    scoring.sql
    pricing.sql
    ranking.sql
    activity.sql
    isolation.sql
  diagnostics/
    economy.sql
    ownership.sql
    round.sql
    rankings.sql
    timeline.sql
  teardown/
    run.sql
  manifest/
    scenarios.json
```

Los nombres son contractuales a nivel de responsabilidades; la implementación puede ajustar archivos concretos sin mezclar foundation, mutación, assertion y diagnóstico.

## Contrato de ejecución

Toda ejecución recibe explícitamente:

```text
scenario       identificador estable del escenario
run_id         identificador único y apto para limpieza
seed           entero reproducible
clock          timestamptz ISO-8601 con zona
profile        small | realistic | stress
keep_on_fail   conserva datos para diagnóstico
```

No se usa `now()` para decisiones de negocio del escenario. Los timestamps técnicos pueden usar tiempo real, pero cutoff, protección, calendario, publicación y expiración derivan de `clock`.

Cada ejecución escribe un manifiesto de evidencia con parámetros, fases, duración, recuentos, operaciones, assertions y resultado. No contiene secretos ni datos personales.

## Perfiles de volumen

| Perfil | Equipos reales | Jugadores | Managers por liga | Jornadas | Uso |
| --- | ---: | ---: | ---: | ---: | --- |
| `small` | 4 | 40 | 3 | 2 | smoke local rápido |
| `realistic` | 12 | 120–144 | 20 | temporada completa | desarrollo y aceptación |
| `stress` | configurable | cientos | varias ligas | temporada completa | rendimiento y contención |

`realistic` es el perfil de referencia funcional. `stress` no define por sí solo objetivos de rendimiento del Sprint 20.

## Modelo deportivo sintético

El generador debe garantizar:

- calendario válido, local/visitante y jornadas ordenadas;
- cinco titulares por equipo y rotaciones plausibles;
- 200 minutos agregados por equipo, salvo prórroga explícita;
- intentos de tiro mayores o iguales que aciertos;
- marcador igual a la suma de puntos normalizados de jugadores;
- DNP, lesión, ausencia, partido aplazado y partido sin estadísticas como estados distintos;
- perfiles de rendimiento persistentes para que la forma y el precio evolucionen con continuidad;
- boxscore parcial, final y corregido con revisiones distinguibles;
- nombres y usernames sintéticos, estables y reconocibles en UI.

Perfiles mínimos de jugador: estrella estable, jugador barato emergente, titular medio, suplente irregular, lesionado, recién inscrito, sin muestra suficiente, baja/cambio de equipo y jugador corregido posteriormente.

## Personas y comportamiento

El perfil `realistic` incluye managers como `@pepe_admin`, `@lucia_agresiva`, `@marcos_ahorrador`, `@ana_clausulas` y `@david_inactivo`. El username es la identidad visible; nunca se usa “Manager Canastio” como dato nominal.

Los comportamientos deben producir historias diferentes: compra temprana, mantenimiento de liquidez, inversión en cláusula, blindaje, clausulazo, rotación frecuente, inactividad y alineación incompleta. Los correos y auth IDs son sintéticos.

Si Supabase Auth no puede prepararse de forma segura mediante SQL de aplicación, un adaptador local crea las identidades y SQL enlaza únicamente sus IDs. La suite nunca escribe contraseñas en manifiestos o logs.

## Catálogo canónico v1

| ID | Estado o ciclo verificable |
| --- | --- |
| `onboarding.no-league` | usuario autenticado sin membresía; solo crear, unirse o cerrar sesión |
| `league.new-admin` | liga creada, administrador único, código válido y roster vacío |
| `league.realistic-20` | liga con 20 managers, usernames y equipos diferenciados |
| `market.empty-roster` | 100 M, mercado abierto, ningún jugador |
| `market.partial-roster` | compras reconciliadas con saldo, ledger y propiedad |
| `market.operations` | compra, venta, inversión, blindaje y clausulazo válidos |
| `market.rejections` | saldo, roster, equipo real, protección, ventana e idempotencia rechazados |
| `lineup.draft` | roster completo, quinteto incompleto y cutoff futuro |
| `lineup.locked` | cinco titulares congelados y dos suplentes |
| `round.live` | varios partidos en curso y puntos provisionales parciales |
| `round.published` | jornada calculada, totales y clasificación publicados |
| `round.corrected` | boxscore corregido, score supersedido y ranking recalculado |
| `pricing.history` | subidas, bajadas, estabilidad, DNP y muestra insuficiente |
| `league.activity` | feed derivado de operaciones, precios, membresías y jornada |
| `account.multi-league` | mismo usuario en varias ligas sin mezclar saldos, rosters o permisos |

## Ciclo productivo de referencia

La vertical de aceptación principal recorre:

```text
T0  usuario sin liga
T1  crea liga e invita managers
T2  managers se incorporan
T3  mercado abierto y plantillas vacías
T4  compras/ventas/inversión/blindaje
T5  quintetos guardados
T6  cutoff y alineaciones congeladas
T7  jornada en curso con datos parciales
T8  partidos finalizados
T9  puntuación y ranking publicados
T10 precios recalculados y actividad visible
T11 corrección de boxscore y republicación auditable
```

Se puede ejecutar el ciclo completo o detenerse en cualquier checkpoint para probar una pantalla o contrato.

## Frontera SQL / dominio / navegador

### SQL

- crea la base deportiva y estados previos;
- carga fixtures y timestamps controlados;
- consulta diagnósticos y assertions;
- limpia exclusivamente el `run_id`.

### Servicios y API reales

- crear/unirse a liga cuando se verifiquen permisos e idempotencia;
- comprar, vender, invertir, blindar y ejecutar cláusula;
- guardar y congelar alineaciones;
- calcular, publicar, corregir y recalcular puntuaciones/precios;
- probar advisory locks, transacciones serializables y reintentos.

### Navegador/E2E

- onboarding bloqueante;
- mercado desde roster vacío;
- guardado de quinteto;
- lectura de jornada, clasificación, actividad y multi-liga;
- errores recuperables y estados temporales.

Una operación no se considera probada porque exista el estado final mediante `INSERT` directo.

## Assertions bloqueantes

Cada assertion devuelve cero violaciones en éxito y falla de manera inequívoca en caso contrario:

### Deporte

- identities y claves naturales no duplicadas;
- marcador coherente con boxscore;
- minutos y tiros válidos;
- revisiones y estados temporales compatibles.

### Economía

- `saldo actual = presupuesto inicial + suma del ledger`;
- cada transacción económica tiene las entradas esperadas y no duplicadas;
- saldo nunca negativo salvo regla futura explícita;
- precio de adquisición, precio actual, bonus y cláusula son reconciliables.

### Propiedad y plantilla

- un jugador pertenece como máximo a un equipo por liga;
- máximo siete jugadores y límite por equipo real;
- ningún lineup usa jugadores ajenos al roster válido para su snapshot.

### Jornada y scoring

- lineup bloqueado con cinco titulares y dos suplentes como máximo;
- solo titulares suman;
- DNP confirmado puntúa cero y no equivale a dato pendiente;
- round score publicado coincide con sus inputs versionados;
- recomputación no duplica resultados y conserva supersesión.

### Ranking y precios

- total igual a suma de jornadas publicadas vigentes;
- posiciones deterministas, consecutivas y con desempate contractual;
- precio actual coincide con último evento vigente;
- DNP, ausencia de partido y muestra insuficiente siguen reglas distintas.

### Seguridad e aislamiento

- ninguna consulta privada cruza ligas o usuarios;
- ningún teardown toca datos sin el `run_id` objetivo;
- no aparecen secretos o correos reales en manifiestos/evidencia.

## Concurrencia y casos negativos

Un runner lanza solicitudes simultáneas para:

- dos compras del mismo jugador;
- compra y clausulazo cruzados;
- dos clausulazos simultáneos;
- repetición de la misma idempotency key;
- guardado de lineup junto al cutoff;
- publicación mientras llega una corrección.

Después de cada carrera se ejecutan las assertions. Se acepta más de un orden de serialización solo cuando todos los resultados admitidos están enumerados; nunca se acepta propiedad doble, ledger parcial o ranking incoherente.

Los rechazos mínimos cubren saldo insuficiente, roster lleno, límite de equipo real, jugador ocupado, protección activa, ventana cerrada, cupo de clausulazo agotado, quinteto incompleto, jugador vendido y operación repetida.

## Integración con el ciclo del harness

### 1. Preflight

- confirmar working tree limpio;
- validar variables obligatorias y que la base no es producción;
- comprobar migraciones y `prisma validate`;
- registrar escenario, run, seed, clock y perfil;
- abortar si el target no está explícitamente permitido para test.

### 2. Foundation

- cargar identidad deportiva estable;
- crear fixtures de auth/test cuando corresponda;
- ejecutar assertions de foundation antes de añadir fantasy.

### 3. Scenario setup

- aplicar el overlay del escenario;
- comprobar recuentos y precondiciones;
- guardar checkpoint `setup`.

### 4. Domain exercise

- ejecutar transiciones temporales en orden;
- invocar API/servicios para mutaciones con reglas;
- ejecutar carreras concurrentes si el escenario las declara.

### 5. Assertions y diagnóstico

- ejecutar assertions después de cada transición crítica;
- al primer fallo, producir diagnóstico acotado al run;
- conservar datos solo si `keep_on_fail=true`.

### 6. Gates deterministas

14F añade al ciclo existente gates específicos, sin retirar los actuales:

```text
seed-manifest-validate
seed-small-smoke
seed-idempotency
seed-assertions
seed-realistic-cycle
seed-teardown-isolation
```

El ciclo general conserva `typecheck`, `lint`, `test`, `python-test`, `ruff`, `prisma-validate` y `diff-scope`. Los gates que requieren PostgreSQL se ejecutan solo con una URL de test verificada y son bloqueantes en el job de integración correspondiente.

### 7. Evidencia

El harness conserva por run:

- manifiesto normalizado;
- tabla de fases y duración;
- assertions ejecutadas;
- operaciones de dominio y resultados saneados;
- diff de recuentos antes/después;
- diagnóstico de fallo;
- resultado del teardown.

No se versionan dumps completos ni secretos. Para escenarios UI se pueden adjuntar capturas sintéticas separadas, pero no sustituyen las assertions.

### 8. Teardown

- borrar exclusivamente entidades atribuidas al run en orden de FK;
- demostrar que el resto de datos conserva checksums/recuentos;
- ejecutar `teardown-isolation`;
- marcar el run como cerrado incluso si falló una fase anterior.

### 9. Reintento del harness

Cada intento obtiene un nuevo `run_id` y conserva seed/clock. El reintento no reutiliza residuos. Si falla un gate, el prompt de retry recibe la assertion y diagnóstico mínimos, no un dump completo. Los tres intentos máximos existentes siguen vigentes.

### 10. Review y cierre

El sprint pasa a `review_pending` solo si todos los gates bloqueantes pasan. La revisión humana ejecuta al menos la vertical `realistic` y abre las pantallas clave en checkpoints T0, T3, T7, T9 y T11. Solo entonces puede marcarse `done` con `node .harness/spec.mjs done sprint-14f-production-simulation-suite`.

## Comandos objetivo

La implementación expondrá comandos equivalentes y documentados; los nombres finales pueden adaptarse a las convenciones del repo:

```text
pnpm test:data:list
pnpm test:data:run --scenario market.operations --profile small --seed 1406 --clock 2026-10-02T18:00:00+02:00
pnpm test:data:cycle --profile realistic --seed 1406
pnpm test:data:assert --run-id <id>
pnpm test:data:diagnose --run-id <id>
pnpm test:data:teardown --run-id <id>
```

No se aceptan comandos que infieran silenciosamente la base objetivo o limpien por nombre genérico.

## Requisitos de aceptación

R1. Existe una arquitectura separada para foundation, scenarios, transitions, assertions, diagnostics y teardown, documentada y accesible mediante un runner único.

R2. Todo run requiere scenario, run_id, seed, clock y profile; ejecutar dos veces los mismos parámetros produce los mismos estados de dominio y resultados, descontando UUID/timestamps técnicos normalizados.

R3. El runner rechaza bases no marcadas explícitamente como test y el teardown demuestra que solo elimina datos del run seleccionado.

R4. Los perfiles `small` y `realistic` cumplen los volúmenes definidos; `realistic` crea 12 equipos reales, al menos 120 jugadores, 20 managers diferenciados y una temporada navegable.

R5. Las estadísticas generadas cumplen coherencia de minutos, tiros, marcador y estados DNP/ausente/aplazado/parcial/final/corregido; una semilla fija reproduce los mismos resultados.

R6. La suite implementa los 15 escenarios canónicos y permite detener o reanudar el ciclo de referencia en checkpoints sin reconstrucción manual.

R7. Operaciones de mercado, liga, alineación, scoring y precios que tengan reglas o concurrencia se ejercitan mediante servicios/API reales; SQL directo solo prepara precondiciones o datos deportivos.

R8. Las assertions económicas reconcilian presupuesto, ledger, saldo, adquisiciones, precios y cláusulas y detectan automáticamente cualquier diferencia como la de comprar 10 M y descontar 6 M.

R9. Las assertions de ownership, roster, lineup, scoring, ranking, precios, permisos e aislamiento pasan después de cada transición crítica.

R10. Se prueban todos los rechazos mínimos y las seis carreras concurrentes sin propiedad doble, ledger parcial, mutación duplicada ni publicación incoherente.

R11. La vertical T0–T11 produce actividad derivada de acciones reales y permite validar onboarding, Mercado, Mi equipo, Jornada, Liga y Perfil con usernames sintéticos coherentes.

R12. La corrección de boxscore conserva inputs y resultados anteriores auditables, supersede la revisión vigente y recalcula totales, posiciones y precios sin duplicados.

R13. Setup, transiciones y teardown son reejecutables; un fallo genera diagnóstico acotado y `keep_on_fail` controla explícitamente la conservación de datos.

R14. El harness ejecuta los seis gates de datos definidos, conserva evidencia saneada por run y mantiene los gates generales existentes.

R15. Los tests no realizan llamadas reales a FAB, no incluyen secretos o PII y separan claramente fixtures sintéticos del modo operativo en vivo.

R16. La suite anterior sigue disponible durante la migración o dispone de un comando de compatibilidad documentado; retirarla requiere paridad de escenarios y rollback por commit, sin migraciones destructivas.

R17. Typecheck, lint, tests web, pytest, ruff, Prisma validate, gates de datos y diff-scope terminan con código cero en una base de integración limpia.

R18. La documentación incluye catálogo, parámetros, ejemplos, tiempos esperados, matriz de cobertura, procedimiento de diagnóstico y límites de fidelidad respecto a producción.

## Plan de trabajo verificable

- [ ] T1. Inventariar tablas, seeds, invariantes, operaciones y estados temporales actuales; capturar la línea base.
- [ ] T2. Definir manifiesto, guardas de base de test, run_id, reloj, seed, perfiles y política de evidencia.
- [ ] T3. Extraer foundation deportiva determinista y generador coherente para `small` y `realistic`.
- [ ] T4. Crear identidades/personas sintéticas y overlays de onboarding, liga, roster y multi-liga.
- [ ] T5. Implementar transiciones temporales T0–T11 y checkpoints reanudables.
- [ ] T6. Integrar operaciones reales de mercado, alineación, scoring, precios y actividad.
- [ ] T7. Implementar assertions y diagnósticos de deporte, economía, ownership, lineup, scoring, ranking, precios, permisos e aislamiento.
- [ ] T8. Implementar rechazos y runner de concurrencia con resultados admitidos explícitos.
- [ ] T9. Añadir catálogo/runner CLI, teardown seguro y compatibilidad temporal con seeds existentes.
- [ ] T10. Integrar gates 14F en `.harness`, jobs local/CI y evidencia por run.
- [ ] T11. Ejecutar `small` completo y vertical `realistic` T0–T11; corregir inconsistencias descubiertas en fixtures o producto mediante specs separadas si cambian reglas.
- [ ] T12. Documentar operación, diagnóstico, matriz de cobertura, tiempos y límites; completar revisión humana y cierre.

## Matriz mínima de QA

| Área | Camino normal | Adverso/corrección |
| --- | --- | --- |
| Onboarding | crear y unirse | código, capacidad y sesión inválidos |
| Mercado | comprar/vender/invertir/blindar/cláusula | saldo, límite, protección, cutoff y carrera |
| Plantilla | vacía, parcial y completa | ownership, límite real y jugador vendido |
| Alineación | draft, guardada y congelada | incompleta, retry y borde de cutoff |
| Jornada | próxima, live y publicada | DNP, aplazado, parcial y sin estadísticas |
| Scoring | cálculo y ranking | corrección, supersesión e idempotencia |
| Precios | sube/baja/estable | DNP y muestra insuficiente |
| Liga | managers, ranking y actividad | multi-liga, permisos e inactividad |
| Operación | setup y teardown | fallo intermedio, keep-on-fail y aislamiento |

## Límites de fidelidad

14F simula con alta fidelidad persistencia y dominio. No certifica por sí solo comportamiento de red real, disponibilidad de Supabase/FAB, scheduler productivo, políticas operativas, rendimiento de infraestructura, PWA/offline ni observabilidad. Esos elementos pertenecen a sus sprints; sus adaptadores podrán consumir estos escenarios.

## Rollback y compatibilidad

El cambio es principalmente aditivo. Los seeds actuales se conservan durante la transición mediante wrappers o comandos legacy. No se permite una migración destructiva para etiquetar datos de test si el aislamiento puede resolverse con claves/namespaces existentes. El rollback elimina runner, escenarios y gates sin modificar datos productivos.

## Entrega y aprobación

Esta entrega define la propuesta y su entrada `spec_ready` en `spec.json`; no autoriza implementación. Para comenzar, el usuario debe aprobar explícitamente Sprint 14F y el harness debe registrar `spec_approved: true` y generar la carpeta durable en `spec/`.
