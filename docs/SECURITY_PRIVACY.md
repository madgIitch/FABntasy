# Seguridad y privacidad

## Controles

- La identidad de usuario procede de `supabase.auth.getUser()` en servidor. Los IDs de recursos solo seleccionan el recurso; nunca sustituyen al actor.
- El middleware aplica CSP compatible con Supabase, PWA y Web Push, headers defensivos, cookies `HttpOnly`/`SameSite=Lax`/`Secure` en producción, protección same-origin y límites separados para autenticación, mutaciones y lecturas. Un 429 incluye `Retry-After`.
- Los valores sensibles se redactan recursivamente y sin distinguir mayúsculas. No se registran cuerpos, cookies, Authorization, contraseñas, tokens, claves FAB ni VAPID.
- Correo, contraseña y borrado requieren comprobar de nuevo la contraseña. Supabase mantiene el correo anterior hasta completar la confirmación configurada.
- La exportación `canastio-account-export.v1` contiene perfil propio, memberships reducidas, equipos propios y preferencias. Excluye correo, sesiones, secretos, RAW FAB y PII de otros miembros.
- El borrado transfiere ligas con miembros, elimina canales privados, anonimiza el perfil conservado para el histórico deportivo/fantasy, elimina el avatar y revoca la identidad Auth.

## Gate de dependencias

CI debe ejecutar `corepack pnpm --filter @fabntasy/web audit:dependencies`. El comando falla ante vulnerabilidades altas o críticas. Una excepción solo puede documentarse aquí con paquete/CVE, alcance, mitigación, responsable y fecha de caducidad (máximo 30 días). No hay excepciones activas.
## Web Push productivo

La sesión Supabase determina siempre el actor. Las rutas rechazan `userId` del cuerpo, validan origen en mutaciones y RLS aplica el mismo aislamiento a SELECT/INSERT/UPDATE/DELETE. El endpoint de dispatch usa un secreto independiente server-side y el de prueba exige sesión, origen, dispositivo propio y rate limit.

Endpoint completo, `p256dh`, `auth`, payload, usuario, liga, claves VAPID y texto libre de excepciones están prohibidos en logs, respuestas, métricas y evidencias. Los errores se reducen a códigos estables; las métricas solo usan resultado y bucket temporal. Las claves privadas actuales o anteriores nunca se almacenan en base de datos ni repositorio.
## Aislamiento social de ligas

Eventos, reacciones, presencia, premios, perfiles y comparativas requieren una membresía activa comprobada en cada petición. Las tablas sociales activan RLS con la misma condición; abandonar o ser expulsado revoca el acceso inmediatamente. Las respuestas son privadas y no se cachean de forma compartida. La presencia expone solo un total reciente, nunca identidades ni histórico.
