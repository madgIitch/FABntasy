# sprint-36-home-league-switcher-and-empty-copy · Selector rápido de liga y estados vacíos claros en Inicio — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) Inicio conserva el orden competición FAB → liga privada; el nombre de la liga activa es un control con chevron visible, nombre accesible y estado expandido anunciado.  ↔ R1
- [x] (T2) Al abrirse, el selector muestra Cambiar de liga, marca exactamente una liga activa, lista las demás membresías ACTIVE disponibles y ofrece Gestionar mis ligas con destino a /app/perfil/ligas.  ↔ R2
- [x] (T3) La selección reutiliza la mutación server-side de liga activa; una respuesta satisfactoria persiste active_league_id, cierra el selector, restaura el foco y refresca Inicio sin navegación a otra pantalla.  ↔ R3
- [x] (T4) Durante una selección pendiente, todas las opciones de cambio quedan deshabilitadas y una segunda activación no genera otra mutación.  ↔ R4
- [x] (T5) Ante cualquier fallo, la interfaz conserva la liga anterior y sus datos, anuncia un mensaje mediante role="alert" y permite reintentar sin recargar la página.  ↔ R5
- [x] (T6) Tras completar el cambio, nuevas resoluciones server-side de Inicio, Mercado, Mi equipo, Jornada y Liga obtienen el mismo leagueId activo y no mezclan datos de la liga anterior.  ↔ R6
- [x] (T7) Si la membresía elegida deja de ser ACTIVE antes de confirmarse, el servidor rechaza la selección y resuelve la liga válida mediante la regla de fallback existente; el cliente representa ese resultado sin asumir autorización local.  ↔ R7
- [x] (T8) El selector admite Enter y Espacio para abrir, flechas para recorrer opciones, Enter para seleccionar, Escape para cerrar, clic exterior para cerrar y devolución del foco al disparador.  ↔ R8
- [x] (T9) El selector permanece visible, sin recorte ni desbordamiento horizontal, en 320, 375, 768, 1024 y 1440 CSS px; los controles interactivos mantienen un área mínima de 44 × 44 px y foco perceptible.  ↔ R9
- [x] (T10) Con NO_CALENDAR, Inicio muestra una sola vez Calendario pendiente, una única explicación orientada al usuario y un CTA cuyo texto describe su destino; no renderiza Sin fecha disponible ni Puntuación y clasificación pendientes.  ↔ R10
- [x] (T11) Inicio no incorpora creación, unión, abandono ni edición de ligas; esas acciones permanecen en Perfil > Mis ligas y solo se enlazan desde Gestionar mis ligas.  ↔ R11
- [x] (T12) Tests unitarios cubren presentación de NO_CALENDAR y resolución de liga activa; tests de integración cubren éxito, rechazo, persistencia, fallback y doble envío; E2E cubre teclado, foco, lector de pantalla, navegación a gestión y coherencia entre superficies.  ↔ R12
- [x] (T13) corepack pnpm typecheck, corepack pnpm lint, corepack pnpm test y diff-scope finalizan con código cero.  ↔ R13
- [x] Tests que cubran los criterios de aceptación
