# sprint-36-home-league-switcher-and-empty-copy · Selector rápido de liga y estados vacíos claros en Inicio — Requisitos

- name: `Sprint 36 - Home League Switcher and Empty-State Copy` · priority: P1 · sdd: true
- aprobado por: peorr · 2026-09-17T21:55:15.559Z

## Contexto

Convertir el nombre de la liga en Inicio en un selector rápido inequívoco, conectado con la liga activa persistida, y sustituir el estado vacío de jornada por copy breve orientado al usuario.

## Requisitos funcionales

R1. Inicio conserva el orden competición FAB → liga privada; el nombre de la liga activa es un control con chevron visible, nombre accesible y estado expandido anunciado.
R2. Al abrirse, el selector muestra Cambiar de liga, marca exactamente una liga activa, lista las demás membresías ACTIVE disponibles y ofrece Gestionar mis ligas con destino a /app/perfil/ligas.
R3. La selección reutiliza la mutación server-side de liga activa; una respuesta satisfactoria persiste active_league_id, cierra el selector, restaura el foco y refresca Inicio sin navegación a otra pantalla.
R4. Durante una selección pendiente, todas las opciones de cambio quedan deshabilitadas y una segunda activación no genera otra mutación.
R5. Ante cualquier fallo, la interfaz conserva la liga anterior y sus datos, anuncia un mensaje mediante role="alert" y permite reintentar sin recargar la página.
R6. Tras completar el cambio, nuevas resoluciones server-side de Inicio, Mercado, Mi equipo, Jornada y Liga obtienen el mismo leagueId activo y no mezclan datos de la liga anterior.
R7. Si la membresía elegida deja de ser ACTIVE antes de confirmarse, el servidor rechaza la selección y resuelve la liga válida mediante la regla de fallback existente; el cliente representa ese resultado sin asumir autorización local.
R8. El selector admite Enter y Espacio para abrir, flechas para recorrer opciones, Enter para seleccionar, Escape para cerrar, clic exterior para cerrar y devolución del foco al disparador.
R9. El selector permanece visible, sin recorte ni desbordamiento horizontal, en 320, 375, 768, 1024 y 1440 CSS px; los controles interactivos mantienen un área mínima de 44 × 44 px y foco perceptible.
R10. Con NO_CALENDAR, Inicio muestra una sola vez Calendario pendiente, una única explicación orientada al usuario y un CTA cuyo texto describe su destino; no renderiza Sin fecha disponible ni Puntuación y clasificación pendientes.
R11. Inicio no incorpora creación, unión, abandono ni edición de ligas; esas acciones permanecen en Perfil > Mis ligas y solo se enlazan desde Gestionar mis ligas.
R12. Tests unitarios cubren presentación de NO_CALENDAR y resolución de liga activa; tests de integración cubren éxito, rechazo, persistencia, fallback y doble envío; E2E cubre teclado, foco, lector de pantalla, navegación a gestión y coherencia entre superficies.
R13. corepack pnpm typecheck, corepack pnpm lint, corepack pnpm test y diff-scope finalizan con código cero.

## Restricciones

- **error_states:** Distingue ausencia de sesión, membresía revocada o liga inactiva, conflicto concurrente, fallo de red/5xx y respuestas tardías. Los errores transitorios conservan menú y contexto anteriores y permiten reintentar; los rechazos de autorización cierran el menú y refrescan desde servidor para representar el fallback; la última selección confirmada prevalece y una respuesta antigua no puede sobrescribir otra posterior.
- **auth_secrets:** La identidad procede exclusivamente de la sesión de Supabase Auth y el servidor valida una membresía ACTIVE en una liga ACTIVE. El cliente no aporta identidad confiable ni se introducen secretos nuevos.
- **rollback_compat:** No requiere migración ni modifica de forma incompatible la API. Reutiliza active_league_id y la mutación existente; un rollback del frontend conserva los datos persistidos y cualquier selección válida.

