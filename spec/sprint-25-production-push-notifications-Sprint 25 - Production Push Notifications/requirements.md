# sprint-25-production-push-notifications · Configuración productiva de Web Push en Supabase y PWA — Requisitos

- name: `Sprint 25 - Production Push Notifications` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-14T23:39:20.077Z

## Contexto

Completar la configuración operativa de las notificaciones Web Push ya iniciadas en Sprint 16, conectando Supabase, secretos VAPID, PWA, dispatcher y dispositivos reales de forma segura y observable.

## Requisitos funcionales

R1. La configuración de producción valida al arrancar NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT; solo la clave pública es accesible al cliente y tests de artefactos, respuestas y telemetría prueban que la privada, auth, p256dh y endpoints completos no aparecen.
R2. Las migraciones aditivas se aplican en Supabase y pruebas ejecutadas con dos usuarios demuestran que RLS bloquea SELECT, INSERT, UPDATE y DELETE cruzados sobre suscripciones, preferencias y entregas; todas las rutas públicas ignoran o rechazan userId aportado por el cliente.
R3. Perfil calcula el estado del dispositivo combinando soporte, permiso y suscripción real, presenta estados diferenciados de no compatible, pendiente, concedido sin suscripción, denegado, suscrito, desuscrito, error y recuperado, y permite opt-in y opt-out únicamente mediante gesto del usuario.
R4. El opt-in registra o reactiva exactamente una suscripción activa para el endpoint y usuario actuales; un endpoint activo de otro usuario no puede transferirse, y logout revoca solo la suscripción del dispositivo según el contrato aprobado.
R5. Una prueba en PWA instalada y cerrada recibe un Push real; notificationclick normaliza el destino mediante una allowlist bajo /app, rechaza URL absoluta, protocol-relative, backslash y ruta externa, enfoca una ventana existente cuando es válida o abre una nueva en otro caso.
R6. Cada evento aprobado produce una clave estable y una restricción única por suscripción, intención y evento; una prueba con al menos dos dispatchers concurrentes acredita como máximo una llamada al sender por clave.
R7. Los reintentos persisten su próximo instante, aplican el backoff aprobado y no superan tres intentos; 404 y 410 marcan solo esa suscripción como revocada y las restantes continúan recibiendo.
R8. El dispatcher vuelve a comprobar antes de enviar que la suscripción sigue activa, pertenece al destinatario y mantiene habilitada la intención; claims abandonados se recuperan después del lease aprobado sin duplicar una entrega ya confirmada.
R9. La estrategia VAPID elegida queda documentada y probada: soporta transición por versión o fuerza resincronización visible y recuperable; ninguna clave privada anterior se versiona ni aparece en evidencias.
R10. Métricas agregadas exponen entregas por resultado, tasa de fallo, backlog por antigüedad e endpoints expirados; alertas usan umbrales y ventanas documentados y sus dimensiones excluyen usuario, liga, endpoint, payload, claves y texto libre de excepciones.
R11. Tests unitarios, integración Supabase y E2E usan sender falso y reloj controlado en CI y cubren autorización, RLS, permisos, opt-in/out, múltiples dispositivos, concurrencia, deduplicación, backoff, límite de intentos, 404/410, renovación, logout, service worker, allowlist, reutilización de ventana y degradación.
R12. El smoke manual documenta fecha, release, navegador y resultado saneado para al menos un Chromium de escritorio y un móvil compatible; plataformas no compatibles muestran instrucciones verificables sin afirmar que la entrega se completó.
R13. corepack pnpm typecheck, corepack pnpm lint, corepack pnpm test, Prisma validate, pruebas RLS, E2E PWA y diff-scope finalizan con código cero.

## Restricciones

- **error_states:** 404/410 expiran y revocan únicamente la suscripción; 400/401/403/413 terminan la entrega con código estable saneado; 429 respeta Retry-After válido limitado a 15 minutos; timeouts, red y 5xx reintentan a 1, 5 y 15 minutos con máximo de tres intentos totales. Los errores locales de soporte, permiso, service worker o PushManager permanecen en Perfil y no crean entregas.
- **auth_secrets:** La identidad siempre deriva de Supabase Auth; RLS impide acceso cruzado y solo la clave VAPID pública llega al cliente. Claves privadas, auth, p256dh, endpoints completos, payloads privados y PII quedan fuera de bundles, respuestas, logs, métricas y evidencias.
- **rollback_compat:** Se elige invalidación explícita sin ventana dual de envío: VAPID_KEY_VERSION detecta el desajuste, elimina la suscripción anterior y requiere nuevo opt-in. El despliegue acepta filas sin versión antes de rotar configuración; la clave anterior solo permanece temporalmente en el gestor para permitir rollback de configuración y nunca se guarda en repo, base de datos o evidencias.

