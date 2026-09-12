# sprint-21-accessibility-responsive-polish · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Ampliación aprobada: arquitectura de Perfil

- **Tesis visual:** un hub breve y sobrio que usa filas continuas para orientar, reservando las superficies densas para una sola tarea por pantalla.
- **Plan de contenido:** identidad y ligas; accesos de cuenta; preferencias; seguridad y privacidad; cierre de sesión.
- **Interacción:** navegación a subrutas con retorno visible, estado de dispositivo previo a los switches y confirmación modal de dos pasos para eliminar la cuenta.
- Rutas: `/app/perfil/preferencias`, `/app/perfil/notificaciones`, `/app/perfil/seguridad`, `/app/perfil/seguridad/{correo,contrasena,sesiones}` y `/app/perfil/privacidad`.

## Ampliación aprobada: arquitectura de Perfil

- **Tesis visual:** un índice compacto y sereno, construido con filas continuas y una única acción clara por pantalla.
- **Plan de contenido:** identidad y ligas; accesos de cuenta; preferencias; seguridad y privacidad; cierre de sesión.
- **Tesis de interacción:** navegación a subrutas con retorno explícito, switches de respuesta inmediata y confirmación modal antes de eliminar.
- `/app/perfil` no renderiza formularios de ajustes.
- `/app/perfil/preferencias`, `/notificaciones`, `/seguridad` y `/privacidad` separan responsabilidades; correo, contraseña y sesiones son destinos secundarios de Seguridad.
- La navegación inferior conserva sus cinco destinos. Las subrutas usan encabezado de retorno y padding seguro inferior.
- No se añaden tablas ni migraciones; se reutilizan acciones y contratos existentes.
