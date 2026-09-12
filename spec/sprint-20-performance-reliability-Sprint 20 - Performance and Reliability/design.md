# sprint-20-performance-reliability · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `services/fab_ingestor/**`
- `prisma/**`
- `tests/**`
- `scripts/**`
- `.github/workflows/**`
- `.env.example`
- `docs/**`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** agregados derivados, índices y autoridad definidos.
- **external_contracts:** PostgreSQL de integración y servicios simulados definidos.
- **edge_cases:** carga, invalidación, recomputación e ingestor caído cubiertos.
- **ui_states:** carga, error, revisión vigente y datos en recomputación definidos.

## Decisiones de la entrevista

- **data_model:** Los scores y rankings publicados existentes siguen siendo la fuente de lectura. Solo se añaden índices guiados por consultas reales y métricas técnicas acotadas; cualquier agregado nuevo debe ser derivable, versionado e invalidable por liga, jornada y revisión.
- **error_states:** Las lecturas ya sincronizadas no dependen de FAB ni del proceso ingestor. Un fallo de recomputación no publica resultados parciales y conserva la última revisión válida. Timeouts y saturación devuelven códigos estables y respuestas recuperables; nunca convierten ausencia o dato pendiente en cero.
- **edge_cases:** Se prueban lecturas simultáneas de home, mercado y ranking durante publicación o corrección de jornada, caché fría y caliente, invalidación concurrente, reintentos idempotentes y caída temporal del ingestor. La publicación usa locks existentes y no bloquea lecturas más allá del presupuesto interactivo.
- **auth_secrets:** Las claves de caché privadas incluyen la identidad y liga resueltas server-side; no contienen tokens, cookies ni PII. Métricas y logs usan rutas normalizadas, códigos y duraciones, con la redacción del Sprint 19. Ningún benchmark utiliza credenciales reales.
- **external_contracts:** Los benchmarks usan PostgreSQL de integración explícitamente marcado y fixtures 14F reproducibles. FAB, Supabase, Web Push y servicios externos se simulan. La instrumentación es server-side y no exige un proveedor concreto en este sprint.
- **ui_states:** Home, mercado y ranking conservan estados de carga, vacío, error y reintento existentes, sin saltos de layout ni bloqueos globales. Si se sirve una última revisión válida durante recomputación, la UI muestra su estado y timestamp sin afirmar que es definitiva.
- **rollback_compat:** Migraciones exclusivamente aditivas. Cada caché puede desactivarse server-side sin perder datos; invalidar o retirar un agregado vuelve a las consultas autoritativas. Los índices pueden revertirse de forma independiente y no cambian contratos públicos.
- **tests:** En el perfil realistic 14F con 12 equipos, 120–144 jugadores y 20 managers, 20 clientes concurrentes y caché caliente, p95 server-side es ≤800 ms para home y ≤1000 ms para mercado y ranking; con caché fría cada ruta queda ≤1500 ms. Una jornada completa se calcula y publica en ≤30 s mientras las lecturas interactivas mantienen p95 ≤1500 ms. Se guardan entorno, dataset, muestras y resultados; los tests funcionales no dependen del reloj de pared y los presupuestos se ejecutan como gate de integración, no en unit tests ruidosos.

