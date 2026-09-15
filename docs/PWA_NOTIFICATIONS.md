# PWA y notificaciones

Sprint 16 añade instalación PWA y Web Push opt-in desde **Perfil**.

## Configuración

Genera un par VAPID y configura `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. La clave privada solo se lee en servidor. Sin estas variables, Perfil muestra un estado neutral y el resto de la aplicación continúa operativo.

Aplica la migración `20260911000100_pwa_push_notifications` antes de activar Push. Una cuenta puede tener varios dispositivos; el cierre de sesión iniciado desde Perfil revoca primero únicamente el UUID/endpoint del navegador actual y conserva los demás.

## Contratos de seguridad

- `GET|POST|PATCH|DELETE /api/notifications` deriva el usuario de Supabase y no acepta un `userId` del cliente.
- Solo se aceptan endpoints HTTPS y claves de tamaño acotado. Un endpoint no puede transferirse entre usuarios.
- El service worker precachea únicamente el fallback y assets públicos. Nunca escribe respuestas de API ni páginas autenticadas en caché.
- Los destinos de notificación deben comenzar por `/app`; cualquier otro valor cae en `/app`.
- Cada entrega se reclama mediante una fila única por suscripción, intención y evento. Los fallos transitorios admiten hasta tres intentos; 404/410 revocan el dispositivo.

El dispatcher `dispatchNotification` recibe eventos de dominio normalizados y un adaptador de envío. En producción se usa `createWebPushSender`; el job interno invoca `POST /api/notifications/dispatch` con `Authorization: Bearer $CANASTIO_PUSH_JOB_SECRET` y el contrato v1 `{ intent, eventKey, userProfileId, leagueId?, title, body, destination }`. No existe dispatch público.

## Operación productiva (Sprint 25)

Custodia `VAPID_PRIVATE_KEY` y `CANASTIO_PUSH_JOB_SECRET` exclusivamente en el gestor de secretos del servidor. `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` y `VAPID_KEY_VERSION` son configuración; solo la primera clave puede entrar al bundle cliente. El despliegue ejecuta `node infrastructure/scripts/validate-push-config.mjs` y falla sin imprimir valores cuando falta o es inválida alguna variable.

Aplica `20260915000100_production_push_notifications` con el rol de migraciones antes de promover web. La migración es aditiva, concede al rol `authenticated` sólo las operaciones protegidas, habilita RLS y crea políticas por `auth.uid()` para suscripciones, preferencias y entregas; una entrega además debe referenciar una suscripción del mismo propietario. Ejecuta `psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f tests/production_push_rls.sql` en el proyecto aislado con Supabase Auth disponible. El workflow `push-notifications` levanta Supabase local y ejecuta la matriz SELECT/INSERT/UPDATE/DELETE con dos usuarios.

Cada instalación conserva un UUID aleatorio local. El endpoint y su propietario inmutable siguen siendo la autoridad: otro usuario recibe `SUBSCRIPTION_OWNED_BY_ANOTHER_USER`; logout/opt-out envía endpoint y UUID del dispositivo actual y nunca revoca los demás. Las respuestas solo incluyen estado y recuentos, jamás endpoint, `p256dh` o `auth`.

La rotación es por invalidación explícita, sin doble envío. Incrementa `VAPID_KEY_VERSION` junto con el nuevo par; las filas antiguas dejan de ser elegibles, Perfil muestra “Volver a activar” y el gesto del usuario elimina la suscripción del navegador y crea otra. Para rollback, conserva la clave anterior solo temporalmente en el gestor de secretos y restaura juntos clave pública, privada y versión. Nunca persistas una privada histórica.

Los claims duran 5 minutos. Se revalidan suscripción, propietario, versión y preferencia justo antes del sender. Hay tres intentos totales con esperas 1/5/15 minutos; `429` respeta `Retry-After` hasta 15 minutos; red, timeout y 5xx reintentan; 400/401/403/413 terminan; 404/410 expiran únicamente ese endpoint. Sender: timeout 10 s, concurrencia operativa máxima 10, payload máximo 3584 bytes y TTL 300 s.

Perfil ofrece “Enviar prueba” con origen y sesión validados, solo para el UUID actual y límite de 3 por usuario/hora. Para smoke real: instala y cierra la PWA, pulsa la prueba antes de cerrarla, confirma recepción y valida que el clic enfoca una ventana existente o abre `/app/perfil/notificaciones`. Destinos absolutos, protocol-relative, con backslash, codificación relativa o fuera de `/app` caen en `/app`.

### Registro de smoke manual

| Fecha UTC | Release/commit | Plataforma | Navegador | Resultado saneado |
|---|---|---|---|---|
| pendiente | pendiente | Escritorio | Chromium estable, PWA instalada | PENDIENTE: no afirmar entrega hasta observarla cerrada |
| pendiente | pendiente | Android compatible | Chrome estable, PWA instalada | PENDIENTE: no afirmar entrega hasta observarla cerrada |

Safari/iOS se registra como compatibilidad observada no bloqueante. Si Push API, service worker o permiso no están disponibles, Perfil muestra “No compatible” o instrucciones de permisos; ese estado no equivale a entrega.
