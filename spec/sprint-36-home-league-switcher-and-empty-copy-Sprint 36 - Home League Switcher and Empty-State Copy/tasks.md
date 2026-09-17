# sprint-36-home-league-switcher-and-empty-copy · Selector compartido de liga y refinamiento visual de Inicio y Liga — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) Inicio conserva el orden competición FAB → liga privada; el nombre de la liga activa es un control con chevron visible, nombre accesible y estado expandido anunciado.  ↔ R1
- [ ] (T2) Al abrirse, el selector muestra Cambiar de liga, marca exactamente una liga activa, lista las demás membresías ACTIVE disponibles y ofrece Gestionar mis ligas con destino a /app/perfil/ligas.  ↔ R2
- [ ] (T3) La selección reutiliza la mutación server-side de liga activa; una respuesta satisfactoria persiste active_league_id, cierra el selector, restaura el foco y refresca Inicio sin navegación a otra pantalla.  ↔ R3
- [ ] (T4) Durante una selección pendiente, todas las opciones de cambio quedan deshabilitadas y una segunda activación no genera otra mutación.  ↔ R4
- [ ] (T5) Ante cualquier fallo, la interfaz conserva la liga anterior y sus datos, anuncia un mensaje mediante role="alert" y permite reintentar sin recargar la página.  ↔ R5
- [ ] (T6) Tras completar el cambio, nuevas resoluciones server-side de Inicio, Mercado, Mi equipo, Jornada y Liga obtienen el mismo leagueId activo y no mezclan datos de la liga anterior.  ↔ R6
- [ ] (T7) Si la membresía elegida deja de ser ACTIVE antes de confirmarse, el servidor rechaza la selección y resuelve la liga válida mediante la regla de fallback existente; el cliente representa ese resultado sin asumir autorización local.  ↔ R7
- [ ] (T8) El selector admite Enter y Espacio para abrir, flechas para recorrer opciones, Enter para seleccionar, Escape para cerrar, clic exterior para cerrar y devolución del foco al disparador.  ↔ R8
- [ ] (T9) El selector permanece visible, sin recorte ni desbordamiento horizontal, en 320, 375, 768, 1024 y 1440 CSS px; los controles interactivos mantienen un área mínima de 44 × 44 px y foco perceptible.  ↔ R9
- [ ] (T10) Con NO_CALENDAR, Inicio muestra una sola vez Calendario pendiente, una única explicación orientada al usuario y un CTA cuyo texto describe su destino; no renderiza Sin fecha disponible ni Puntuación y clasificación pendientes.  ↔ R10
- [ ] (T11) Inicio no incorpora creación, unión, abandono ni edición de ligas; esas acciones permanecen en Perfil > Mis ligas y solo se enlazan desde Gestionar mis ligas.  ↔ R11
- [ ] (T12) Tests unitarios cubren presentación de NO_CALENDAR y resolución de liga activa; tests de integración cubren éxito, rechazo, persistencia, fallback y doble envío; E2E cubre teclado, foco, lector de pantalla, navegación a gestión y coherencia entre superficies.  ↔ R12
- [ ] (T13) corepack pnpm typecheck, corepack pnpm lint, corepack pnpm test y diff-scope finalizan con código cero.  ↔ R13
- [ ] (T14) Inicio, Mercado, Mi equipo, Jornada y Liga reutilizan un único componente de selector rápido: nombre de liga de 18–20 px semibold, sin caja de formulario, chevron SVG de 12–14 px alineado ópticamente y área pulsable mínima de 44 px.  ↔ R14
- [ ] (T15) El menú compartido muestra Cambiar de liga, check visual de la activa, otras membresías disponibles y Gestionar mis ligas; no usa un select nativo ni botones Activar. Conserva semántica accesible sin indicadores de radio visibles.  ↔ R15
- [ ] (T16) Tras confirmar el cambio y representar el contexto canónico, anuncia Ahora estás en {nombre} mediante role=status; errores, doble envío, fallback y reconciliación conservan el contrato existente.  ↔ R16
- [ ] (T17) Liga elimina Ver miembros por duplicar el tab Miembros; mantiene el recuento y ofrece Invitar únicamente al actor autorizado, reutilizando el flujo existente sin rotar ni generar credenciales automáticamente.  ↔ R17
- [ ] (T18) Clasificación, Actividad y Miembros caben sin scrollbar decorativa en 393 px; en 320 px conservan legibilidad, foco y objetivos táctiles sin ocultar opciones.  ↔ R18
- [ ] (T19) La clasificación vacía muestra Aún no hay clasificación y La clasificación aparecerá cuando se publiquen los primeros resultados, con altura natural sin min-height de una tabla futura.  ↔ R19
- [ ] (T20) Las acciones textuales de contexto no incorporan flechas ornamentales; se conservan los iconos funcionales de navegación y el avatar actual.  ↔ R20
- [ ] (T21) La ampliación no modifica esquema, APIs, reglas de puntuación, permisos, avatar ni formato de clasificación con datos. Perfil mantiene la gestión completa.  ↔ R21
- [ ] (T22) Pruebas de componente e integración verifican el selector compartido, anuncio de éxito y permisos de invitación; E2E autenticado y revisión visual cubren cinco superficies, cero/una/varias ligas, teclado y anchos 320/375/393/768/1024/1440. Los escenarios omitidos se documentan y no cuentan como verificados.  ↔ R22
- [ ] Tests que cubran los criterios de aceptación
