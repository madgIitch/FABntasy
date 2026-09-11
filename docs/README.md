# docs/ — Memoria durable del proyecto

- [Dirección visual 14D](design/CANASTIO_14D_VISUAL_DIRECTION.md) — análisis del vídeo, componentes y adaptación verde/blanco para Canastio (propuesta).
- [Spec 14D](design/SPRINT_14D_SPEC.md) — rediseño integral verde y blanco completado.
- [Spec 14E](design/SPRINT_14E_SPEC.md) — reskin global bosque oscuro, blanco roto y lima completado.
- [Spec 14F](testing/SPRINT_14F_SPEC.md) — propuesta de simulación productiva, escenarios SQL y ciclo de datos del harness.
- [Operación de la suite 14F](testing/SPRINT_14F_INSTRUCTIONS.md) — preparación de PostgreSQL, ejecución, assertions, diagnóstico, gates y teardown seguro.
- [Runner de datos 14F](testing/TEST_DATA_RUNNER.md) — catálogo, preflight y guardas para bases sintéticas.
- [Actividad de liga (propuesta futura)](design/FUTURE_LEAGUE_ACTIVITY_SPEC.md) — taxonomía, contrato y estados previstos para el feed cronológico.
- [PWA y notificaciones](PWA_NOTIFICATIONS.md) — configuración VAPID, seguridad, caché y semántica de entrega.
- [Administración de ingesta](INGESTION_ADMIN.md) — rol, cola, worker, RAW redactado y operación del panel.
- [Spec de despliegue productivo del ingestor](operations/INGESTOR_PRODUCTION_DEPLOYMENT_SPEC.md) — infraestructura, secretos, persistencia, CI/CD, observabilidad y runbooks pendientes para Sprint 22B.

- `ARCHITECTURE.md` — visión general, componentes, flujo de datos.
- `DECISIONS.md` — registro de decisiones (ADR). El harness añade entradas al tomar decisiones relevantes.
- `PLAYER_PRICING.md` — contrato del precio global, evolución, DNP, histórico y cláusula base.
- `PRIVATE_LEAGUES.md` — membresías, invitaciones, privacidad y migración de equipos por liga.
- `CONVENTIONS.md` — convenciones de código, naming, ramas.

El agente lee esta carpeta antes de implementar. `spec.mjs approve` añade contexto mínimo automáticamente
a `ARCHITECTURE.md` y `DECISIONS.md`, pero el dev debe rellenar la parte de visión y convenciones del repo.

Mínimo útil antes de la primera feature:

1. En `ARCHITECTURE.md`, completa objetivo del producto, componentes existentes y restricciones conocidas.
2. En `CONVENTIONS.md`, completa cómo se ejecuta, testea y despliega este repo.
3. En `DECISIONS.md`, deja cualquier decisión que no deba redescubrir otro agente.
