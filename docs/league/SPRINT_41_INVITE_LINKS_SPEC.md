# Sprint 41 · Invitación a ligas mediante enlace

Estado: **implementado; revisión humana pendiente**. Este documento define el contrato. La migración debe aplicarse antes de desplegar el código.

## Objetivo

El propietario comparte un enlace de invitación. El destinatario lo abre, ve qué liga es y confirma su entrada. Crear una liga y unirse a ella no requieren contraseña ni código de liga. La autenticación de la cuenta sigue siendo necesaria para adquirir una membresía.

## Flujo de producto

1. Al crear una liga se solicita nombre y competición. El servidor crea la liga, su miembro `OWNER` y una invitación inicial. La pantalla de éxito ofrece copiar o compartir el enlace.
2. En la liga activa, **Invitar** muestra el enlace al propietario y permite copiarlo o compartirlo con las funciones del dispositivo. **Regenerar enlace** pide confirmación y revoca el anterior. Los miembros ordinarios pueden consultar la liga, pero no obtener ni regenerar el enlace desde la aplicación.
3. El enlace abre una landing pública con nombre de la liga, competición y ocupación actual, sin lista de miembros, datos de contacto ni IDs internos. La landing distingue enlace inválido, revocado, vencido si se establece caducidad, liga no disponible y liga llena.
4. El visitante no autenticado inicia sesión o se registra; al terminar vuelve a la invitación. El visitante autenticado ve **Unirme a esta liga** y confirma. Abrir la URL no crea una membresía automáticamente.
5. Tras entrar, la nueva liga queda activa y se abre su ficha. Si ya es miembro, la acción lleva a la liga sin crear otra membresía ni emitir eventos repetidos.
6. **Perfil → Mis ligas** y el onboarding ofrecen crear una liga o abrir/pegar un enlace de invitación. No presentan campos de código o contraseña. La ruta de unión dedicada puede aceptar el enlace pegado, pero debe llevar al mismo flujo de confirmación.

## Contrato de datos y seguridad

- Reutilizar `league_invites` para tokens aleatorios opacos de al menos 128 bits. Guardar SHA-256 para resolverlos y una copia cifrada con clave del servidor para que el propietario pueda volver a copiar el enlace. Nunca almacenar el token en claro. La creación y rotación deben dejar como máximo una invitación utilizable por liga. Los registros históricos pueden conservarse revocados para auditoría.
- El enlace es una credencial de acceso a la **posibilidad de solicitar la unión**, no una sesión de usuario. El servidor resuelve el token y exige Supabase Auth al confirmar. Nunca acepta un `userId` del cliente como actor.
- El propietario es el único actor que puede generar o regenerar invitaciones. La respuesta autenticada que permite copiar el enlace debe tener `private, no-store`. No incluir token en logs, errores, analítica, notificaciones, eventos sociales ni metadatos de previsualización. Evitar enviarlo como `Referer` a terceros.
- Confirmar la unión revalida token, estado de liga, competición Fantasy y capacidad **dentro de la transacción**. Bloquear la liga o usar una garantía equivalente para impedir que dos personas ocupen simultáneamente la última plaza. Reactivar una membresía inactiva sin duplicarla. Mantener aislamiento por `leagueId`.
- La continuidad tras login/registro conserva la intención de visitar el enlace por un tiempo acotado y no convierte el token en una sesión. La expiración de esa intención no autoriza la unión; el usuario puede reabrir el enlace.

## Sustitución del flujo anterior

- El formulario de creación deja de pedir contraseña. Onboarding, preview, Liga y Mis ligas dejan de mostrar código, copiar código, pedir contraseña o cambiar clave de acceso.
- La unión por `POST /api/fantasy/leagues/join` con `{code,password}` y la rotación por `/credentials` dejan de aceptar nuevas operaciones tras el cambio. La nueva API de invitaciones debe usar el envelope `fantasy-league-api.v1`, códigos de error estables y una mutación de unión con token. Los nombres y cuerpos exactos de los endpoints se fijarán antes de aprobar.
- Los códigos y hashes de contraseña ya almacenados se conservan durante la migración para evitar pérdida de datos, pero dejan de conceder acceso. No reactivar enlaces antiguos revocados por la migración de Sprint 12. Las ligas futuras reciben el enlace al crearse; para una liga existente, se crea al primer acceso del owner a **Invitar**. No se altera owner, miembros, equipos, saldos ni historial.
- El cambio sustituye expresamente los criterios de acceso por código y contraseña de Sprints 12, 31, 33 y 34. Sus contratos de capacidad, autenticación, pertenencia y aislamiento siguen vigentes.

## Estados y verificación

- Un enlace inválido o revocado nunca permite unión. Una liga llena explica el motivo sin crear membresía. Una liga deshabilitada no admite nuevas altas. Los mensajes evitan filtrar detalles internos.
- La interfaz cubre carga, error de red, copia/compartir no disponible, autenticación, confirmación, éxito y reintento. Es operable por teclado y lector de pantalla desde 320 px.
- Tests unitarios, integración PostgreSQL y E2E cubren permisos, hash y no filtración, creación, rotación, enlaces antiguos, login/registro, capacidad simultánea, idempotencia, reingreso, ligas existentes, competición deshabilitada, accesibilidad y móvil. Gates: typecheck, lint, test, Prisma validate y diff-scope.

## Decisión de producto aprobada

**Vigencia y reutilización:** el enlace es reutilizable hasta que el propietario lo regenere. No caduca automáticamente ni se consume al usarlo. La capacidad sigue limitada a 20 miembros activos.

La API nueva usa `GET/POST /api/fantasy/leagues/[leagueId]/invites` para consultar/regenerar y `GET/POST /api/fantasy/leagues/invite/[token]` para previsualizar/confirmar. La unión recibe el token solo desde la ruta y no requiere cuerpo adicional.
