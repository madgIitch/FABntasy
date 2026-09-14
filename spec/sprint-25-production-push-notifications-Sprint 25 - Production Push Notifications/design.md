# sprint-25-production-push-notifications · Configuración productiva de Web Push en Supabase y PWA — Diseño

## Scope (archivos que puede tocar)

- `apps/web/app/api/notifications/**`
- `apps/web/app/app/perfil/**`
- `apps/web/src/server/notifications.ts`
- `apps/web/src/server/web-push-sender.ts`
- `apps/web/src/server/observability/**`
- `apps/web/public/sw.js`
- `apps/web/e2e/pwa-notifications.spec.ts`
- `apps/web/src/**/*.test.ts`
- `packages/domain/notifications/**`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `tests/**`
- `infrastructure/**`
- `.github/workflows/**`
- `.env.example`
- `docs/PWA_NOTIFICATIONS.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/BETA_OBSERVABILITY_RUNBOOK.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Se define una extensión aditiva de NotificationDelivery con nextAttemptAt, claimedAt, claimToken y lastAttemptAt; PENDING con claim anterior a 5 minutos es recuperable. La deduplicación autoritativa permanece en (pushSubscriptionId, intent, eventKey). PushSubscription conserva endpoint activo único, propietario inmutable y vapidKeyVersion pública, sin persistir claves privadas.
- **external_contracts:** Quedan definidos el contrato interno v1 de los productores, eventKey determinista, disparo tras commit, job server-side autenticado, ausencia de dispatch público y prueba autenticada por dispositivo con validación de origen/CSRF. Antes de aprobar falta fijar valores concretos del rate limit de la prueba y del job, así como límites operativos del proveedor Web Push —timeout, concurrencia y tamaño máximo aceptado— y su configuración.
- **edge_cases:** Antes del sender se revalidan actividad, propietario y preferencia. Logout revoca solo el dispositivo actual; un cambio de cuenta exige revocación previa y nunca transfiere endpoints activos. La instalación usa un UUID local aleatorio que rota al reinstalar, mientras endpoint y propietario son la identidad server-side autoritativa.
- **ui_states:** Las preferencias por intención son globales y la suscripción es por dispositivo. La fuente visual autoritativa combina soporte, Notification.permission y PushManager.getSubscription(), con transiciones y acciones definidas para no compatible, default, granted sin suscripción, suscrito, denied, error, reintento y recuperación al estado real derivado.

## Decisiones de la entrevista

- **external_contracts:** Los productores existentes de mercado, cutoff/alineación, membresía de liga y publicación/corrección de jornada emiten un contrato interno v1 `{intent,eventKey,userProfileId,leagueId?,title,body,destination}` con `eventKey` determinista. Un job server-side protegido por secreto interno reclama entregas vencidas; no hay endpoint público de dispatch. La prueba se solicita desde Perfil por el usuario autenticado, solo para su dispositivo, con rate limit, CSRF/origen validado y una intención técnica separada que no altera preferencias. Los recordatorios de cutoff se programan en las ventanas ya definidas por Sprint 16; el resto se dispara tras commit del evento de dominio.
- **adv-0b287e417a:** ### [adv-179f592cd3] No se define cómo se identifica de forma inequívoca el «dispositivo actual» ni el contrato exacto de logout: qué suscripción se revoca si existen varias, si falta la suscripción local o si el mismo endpoint está registrado más de una vez.

**R:**
- **adv-7649a1df2b:** ### [adv-3ca5393367] No se especifica qué debe ocurrir cuando un endpoint ya activo pertenece a otro usuario: rechazo y código observable, conservación de la sesión anterior o exigencia de revocación previa.

**R:**
- **adv-c8bb7de9a8:** ### [adv-b9f0fdfd85] Faltan los intervalos exactos del backoff, qué respuestas además de 429/5xx son transitorias y si el máximo de tres intentos incluye el envío inicial.

**R:**
- **adv-d6f38668be:** ### [adv-0c6deaecd0] No se concreta la allowlist de destinos bajo /app ni el tratamiento de query, fragmentos, codificación, segmentos relativos o múltiples ventanas existentes; tampoco se define si una ventana reutilizada debe navegar al destino antes de enfocarse.

**R:**
- **adv-2209d38ad3:** ### [adv-eb6c7b7f30] No se definen para las métricas la fórmula y denominador de la tasa de fallo, los buckets de antigüedad del backlog, ni los umbrales, ventanas y severidades de las alertas específicas de Push.

**R:**
- **adv-09e9781c8c:** ### [adv-417db4197f] No se define qué significa exactamente «producción valida al arrancar»: qué proceso debe fallar, en qué entornos, y cuál es el resultado observable esperado cuando falta o es inválida cada variable VAPID.

**R:**

