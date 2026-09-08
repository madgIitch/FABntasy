# sprint-14d-green-white-design-system · Sprint 14D - Rediseño integral verde y blanco — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) La implementación sigue docs/design/CANASTIO_14D_VISUAL_DIRECTION.md; mantiene la distinción entre componentes finales del vídeo y láminas explicativas, sin introducir cuadrículas moradas, bloques pastel de wireframe ni halo de cursor.  ↔ R1
- [x] (T2) Todas las rutas de producto existentes usan canvas claro, superficies blancas y verde principal #00843D; el lima #c9ff36 deja de ser acento de interfaz y no quedan páginas con fondos oscuros heredados, salvo módulos invertidos deliberados en verde profundo.  ↔ R2
- [x] (T3) Los colores y escalas compartidos proceden de tokens semánticos; se migran globals.css y CSS Modules sin resolver el rediseño mediante una capa de overrides globales que deje componentes antiguos incoherentes.  ↔ R3
- [x] (T4) Inter es la tipografía de interfaz, datos y títulos operativos; Oswald se limita a marca/portada, con máximo dos familias, números tabulares y campos de al menos 16 px.  ↔ R4
- [x] (T5) Las superficies usan ritmo de 8 px, radio principal de 24 px y padding de 24 px reducible a 16 px en móvil; las filas de datos no se convierten en tarjetas elevadas individuales y ninguna medida de 352 px impide reflow.  ↔ R5
- [x] (T6) Botones, campos, tabs, badges, avatares, listas y diálogos comparten variantes y estados accesibles; iconos coherentes y controles sin texto tienen nombre accesible, y las acciones principales tienen targets mínimos de 44 px.  ↔ R6
- [x] (T7) La portada conserva marca reconocible y CTA visible en el primer viewport móvil; cualquier fotografía nueva es propia o autorizada, tiene fallback y no reutiliza imágenes o marcas del vídeo como assets de producción.  ↔ R7
- [x] (T8) Registro mantiene username obligatorio y los flujos de verificación/recuperación; el onboarding sin membresía sigue limitado a crear liga, unirse y cerrar sesión, incluso al solicitar una ruta privada profunda.  ↔ R8
- [x] (T9) El shell conserva cinco destinos móviles y avatar de perfil; identifica selección actual, respeta safe areas y no tapa controles ni foco.  ↔ R9
- [x] (T10) Inicio conserva la prioridad de acción con vencimiento y sus fuentes reales; Mercado, Mi equipo, Jornada, Liga y perfil conservan acciones, permisos, borradores y estados temporales al cambiar su presentación.  ↔ R10
- [x] (T11) Clasificación, calendario, fichas de jugador/equipo/partido y desglose de puntuación adoptan el mismo sistema; nombres largos, importes grandes y ausencia de retrato no rompen alineación ni ocultan información necesaria.  ↔ R11
- [x] (T12) Loading, vacío, error, offline, provisional, bloqueado y pendiente reciben tratamiento coherente y textual; no se inventan métricas, mensajes, notificaciones, mapas ni progreso para reproducir un componente de referencia.  ↔ R12
- [x] (T13) Se verifica contraste mínimo de 4.5:1 para texto normal y 3:1 para texto grande y gráficos/controles necesarios; foco visible y estados no dependen exclusivamente del color.  ↔ R13
- [x] (T14) Se revisan capturas de las familias de pantallas a 320, 375, 430, 768 y 1440 px, con zoom 200 %, navegación por teclado y áreas seguras; no hay scroll horizontal salvo tablas justificadas y documentadas.  ↔ R14
- [x] (T15) Las transiciones de feedback y diálogos son breves, no cambian el layout ni reinician animaciones en cada actualización; prefers-reduced-motion elimina desplazamientos y animación ornamental.  ↔ R15
- [x] (T16) Tests existentes, typecheck, lint y build pasan; los smoke tests cubren registro, onboarding bloqueante, navegación, perfil/logout y flujos operativos críticos, acompañados de revisión manual de capturas y contraste.  ↔ R16
- [x] (T17) El sprint no requiere migraciones, cambios en ingesta FAB ni alteración de contratos de negocio; el rollback visual no modifica datos. Notificaciones, seguridad avanzada y selector de temas permanecen en sus sprints con referencia al sistema 14D.  ↔ R17
- [x] Tests que cubran los criterios de aceptación
