# sprint-41-league-invite-links · Invitación a ligas mediante enlace — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) Crear una liga no solicita contraseña y crea la membresía OWNER y la invitación inicial de forma coherente.  ↔ R1
- [x] (T2) El propietario puede obtener un enlace compartible de la liga y regenerarlo; regenerar invalida inmediatamente el enlace anterior sin expulsar miembros existentes.  ↔ R2
- [x] (T3) Un enlace contiene un token opaco de al menos 128 bits aleatorios, sin IDs internos; se persiste su hash para validación y una copia cifrada para que solo el propietario pueda volver a copiarlo, nunca el token en claro ni en logs o analítica.  ↔ R3
- [x] (T4) Al abrir un enlace válido se muestra el nombre de la liga, competición y ocupación; un usuario no autenticado puede iniciar sesión o registrarse y volver a la invitación.  ↔ R4
- [x] (T5) Un invitado autenticado confirma expresamente la unión; no se le solicita código, contraseña ni otra credencial de liga, y abrir el enlace no lo incorpora por sí solo.  ↔ R5
- [x] (T6) La unión respeta el límite de 20 miembros activos contando al propietario, es idempotente para miembros existentes y no excede la capacidad ante altas simultáneas.  ↔ R6
- [x] (T7) Enlaces inexistentes, revocados, expirados según la política acordada, ligas inactivas o llenas y competiciones Fantasy deshabilitadas tienen estados de interfaz y errores seguros y estables.  ↔ R7
- [x] (T8) Los puntos de entrada de código y contraseña y sus endpoints de unión o rotación dejan de permitir nuevas altas con esas credenciales; los miembros existentes conservan membresía, equipo e historial.  ↔ R8
- [x] (T9) La invitación y su token no se exponen en listados, actividad, metadatos sociales, referer de terceros ni a actores sin autorización; la landing solo revela la información mínima definida.  ↔ R9
- [x] (T10) Pruebas unitarias, PostgreSQL y E2E cubren creación, compartir, autenticación/registro, confirmación, regeneración, enlaces antiguos, carreras por la última plaza, reingreso, permisos, estados de error, accesibilidad y móvil.  ↔ R10
- [x] Tests que cubran los criterios de aceptación
