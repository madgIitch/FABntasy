# sprint-20-performance-reliability · undefined — Requisitos

- name: `Sprint 20 - Performance and Reliability` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-12T10:51:50.692Z

## Contexto



## Requisitos funcionales

R1. Home, mercado y ranking tienen benchmarks reproducibles sobre el perfil `realistic` de Sprint 14F que registran entorno, dataset, concurrencia, muestras, p50, p95 y errores.
R2. Con 20 clientes concurrentes y caché caliente, el p95 server-side es como máximo 800 ms para home y 1000 ms para mercado y ranking; con caché fría cada ruta queda como máximo en 1500 ms.
R3. El cálculo y publicación de una jornada completa del perfil `realistic` termina en 30 segundos o menos mientras las lecturas interactivas mantienen p95 de 1500 ms o menos.
R4. Los rankings publicados se leen desde resultados persistidos o un agregado derivado versionado; ninguna request recalcula desde cero scores de jugadores, jornadas o clasificación completa.
R5. La publicación y las correcciones son atómicas e idempotentes: un fallo conserva visible la última revisión válida y nunca expone una mezcla parcial de revisiones.
R6. Las claves de caché privadas incluyen actor y liga resueltos server-side; cambiar parámetros cliente no cruza usuarios o ligas y ninguna clave, métrica o log contiene tokens, cookies, secretos o PII.
R7. La invalidación está ligada como mínimo a liga, jornada y revisión; una publicación, corrección, operación de mercado o cambio de alineación invalida únicamente las lecturas afectadas y no sirve datos incompatibles.
R8. La caída temporal del ingestor no afecta a las lecturas de datos ya sincronizados y ninguna ruta web realiza llamadas directas a FAB.
R9. Las queries de home, mercado, ranking y publicación quedan inventariadas con `EXPLAIN (ANALYZE, BUFFERS)` sobre datos realistas; cada scan o sort costoso tiene índice aditivo o justificación documentada.
R10. La carga simultánea cubre caché fría y caliente, publicación, corrección, invalidación concurrente y reintentos; no produce deadlocks, duplicados, resultados parciales ni errores no controlados.
R11. Métricas server-side mínimas registran duración, resultado, operación y estado de caché con cardinalidad acotada y redacción conforme al Sprint 19; existen umbrales de alerta documentados para latencia, errores y frescura.
R12. Cachés y optimizaciones pueden desactivarse sin pérdida de datos ni cambio del contrato público; las migraciones son aditivas y existe ruta documentada de rollback.
R13. La UI de home, mercado y ranking conserva estados de carga, error y reintento y, durante una recomputación, identifica la última revisión válida y su timestamp sin presentarla como nueva publicación.
R14. Los tests de rendimiento usan únicamente una base de integración marcada y fixtures sintéticos; no llaman a FAB, Supabase, Web Push ni servicios externos reales.
R15. Typecheck, lint, tests, pytest, ruff, Prisma validate, diff-scope y el gate de rendimiento reproducible terminan con código cero.

## Restricciones

- **error_states:** degradación, publicación atómica y respuestas recuperables definidas.
- **auth_secrets:** aislamiento de caché y métricas saneadas definidos.
- **rollback_compat:** cambios aditivos y bypass de caché definidos.

