# PWA y notificaciones

Sprint 16 añade instalación PWA y Web Push opt-in desde **Perfil**.

## Configuración

Genera un par VAPID y configura `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. La clave privada solo se lee en servidor. Sin estas variables, Perfil muestra un estado neutral y el resto de la aplicación continúa operativo.

Aplica la migración `20260911000100_pwa_push_notifications` antes de activar Push. Una cuenta puede tener varios dispositivos; al cerrar sesión se revocan sus suscripciones activas.

## Contratos de seguridad

- `GET|POST|PATCH|DELETE /api/notifications` deriva el usuario de Supabase y no acepta un `userId` del cliente.
- Solo se aceptan endpoints HTTPS y claves de tamaño acotado. Un endpoint no puede transferirse entre usuarios.
- El service worker precachea únicamente el fallback y assets públicos. Nunca escribe respuestas de API ni páginas autenticadas en caché.
- Los destinos de notificación deben comenzar por `/app`; cualquier otro valor cae en `/app`.
- Cada entrega se reclama mediante una fila única por suscripción, intención y evento. Los fallos transitorios admiten hasta tres intentos; 404/410 revocan el dispositivo.

El dispatcher `dispatchNotification` recibe eventos de dominio normalizados y un adaptador de envío. En producción se usa `createWebPushSender`; jobs futuros pueden invocarlo sin acoplar el dominio al proveedor.
