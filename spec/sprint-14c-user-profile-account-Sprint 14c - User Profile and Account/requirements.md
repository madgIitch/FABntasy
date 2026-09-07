# sprint-14c-user-profile-account · Sprint 14c - User Profile and Account — Requisitos

- name: `Sprint 14c - User Profile and Account` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-07T15:05:42.963Z

## Contexto



## Requisitos funcionales

R1. La navegación móvil conserva exactamente los cinco destinos principales Inicio, Mercado, Mi equipo, Jornada y Liga; Perfil no se añade como sexta pestaña y se abre desde un avatar accesible situado en la cabecera autenticada.
R2. La ruta /app/perfil resuelve la identidad exclusivamente desde la sesión de Supabase y nunca acepta un user_id del cliente para leer o modificar otro perfil.
R3. El perfil distingue tres conceptos: username global único y estable para encontrar o invitar al usuario, nombre visible global opcional y nombre/escudo de equipo propios de cada liga; editar el perfil no renombra equipos ni ligas.
R4. El username se normaliza a minúsculas, admite entre 3 y 24 caracteres alfanuméricos o guion bajo, se almacena sin @, se compara sin distinguir mayúsculas y muestra un error específico si ya está ocupado.
R5. Crear cuenta exige correo, username y contraseña. El registro valida el username en servidor con las mismas reglas del perfil y su reserva es atómica con la creación de Auth y UserProfile: dos altas concurrentes no pueden compartirlo y un conflicto no deja una cuenta Auth huérfana; el formulario conserva correo y username y muestra un error accionable sin conservar la contraseña.
R6. El avatar es opcional; cuando no existe se muestra un fallback determinista y accesible. Las imágenes aceptadas se validan por tipo y tamaño tanto en cliente como en servidor, se guardan en almacenamiento deliberadamente configurado y al reemplazarlas no quedan objetos huérfanos.
R7. La cabecera del perfil muestra avatar, @username, nombre visible cuando exista y una acción Editar perfil; nunca utiliza el correo como nombre público ni expone el correo en superficies de liga.
R8. El resumen fantasy solo muestra métricas calculables con datos persistidos y define su alcance: número de ligas activas, puntos totales publicados agregados por equipos del usuario y posiciones o victorias únicamente cuando exista una regla inequívoca; valores ausentes se muestran como pendientes o se omiten, nunca como cero inventado.
R9. Mis ligas lista únicamente membresías activas del usuario con nombre de liga, nombre de su equipo y número real de miembros; cada fila abre la liga correspondiente y las acciones crear/unirse reutilizan los flujos existentes.
R10. La sección Cuenta muestra el correo de la sesión y su estado real de verificación, ofrece acceso al flujo seguro de cambio o recuperación de contraseña y no renderiza contraseñas simuladas ni secretos en HTML, logs o respuestas.
R11. Cerrar sesión aparece como una acción aislada y no destructiva; antes de ejecutarse muestra un diálogo con Cancelar y Cerrar sesión, gestiona foco y Escape, invalida la sesión y redirige a /login.
R12. Notificaciones detalladas, sesiones activas, autenticación en dos pasos, preferencias de privacidad, exportación y eliminación de cuenta se presentan solo como destinos futuros cuando exista funcionalidad real; no se crean interruptores o estados ficticios en 14C.
R13. La pantalla usa secciones y separadores con jerarquía clara, no una cuadrícula de tarjetas equivalentes; funciona sin scroll horizontal desde 320 px, respeta safe areas, objetivos táctiles de 44 px, teclado y prefers-reduced-motion.
R14. Las mutaciones validan sesión, longitud y formato, devuelven estados accionables para conflicto, archivo inválido, error de almacenamiento y sesión caducada, y no pierden los valores válidos del formulario tras un error recuperable.
R15. La migración de perfiles es retrocompatible: no fabrica usernames públicos a partir del correo; los usuarios existentes sin username deben completar uno antes de usar flujos sociales o mutaciones fantasy, sin perder acceso a su cuenta ni relaciones existentes, y el rollback no elimina identidades o avatares de otros usuarios.
R16. Tests de esquema, servicio, componentes y E2E cubren registro con username, autorización, unicidad concurrente, cuenta Auth no huérfana, edición, fallback y reemplazo de avatar, perfil heredado incompleto, métricas sin datos, listado de ligas, cierre de sesión, navegación de cinco pestañas y viewport de 320 px.

## Restricciones

- **error_states:** Cubre perfil ausente, sesión caducada, username ocupado, validación de imagen, fallo de almacenamiento, ausencia de ligas y cierre de sesión fallido.
- **auth_secrets:** La sesión determina siempre el perfil; el correo procede de Supabase Auth y no se publica en ligas; ninguna contraseña, token o identificador arbitrario del cliente se persiste o registra.
- **rollback_compat:** La migración es aditiva, mantiene perfiles y equipos existentes y permite retirar la UI sin romper autenticación ni relaciones fantasy.
