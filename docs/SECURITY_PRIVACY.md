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
