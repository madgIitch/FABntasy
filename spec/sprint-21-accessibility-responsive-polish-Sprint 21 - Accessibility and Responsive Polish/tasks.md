# sprint-21-accessibility-responsive-polish · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) AC1: Las acciones críticas pueden completarse solo con teclado en desktop, con foco visible y orden determinista.  ↔ R1
- [ ] (T2) AC2: Los controles táctiles principales miden al menos 44 × 44 CSS px o disponen de un área de activación equivalente sin solapamientos.  ↔ R2
- [ ] (T3) AC3: Los estados loading, empty, offline y error se distinguen mediante texto y semántica accesible, no solo color.  ↔ R3
- [ ] (T4) AC4: Los diálogos de compra, venta, invitación y lineup contienen el foco, responden a Escape cuando procede y restauran el foco al disparador.  ↔ R4
- [ ] (T5) AC5: Inicio, Mercado, Mi equipo, Jornada, Liga y Perfil no presentan infracciones axe critical o serious en los estados cubiertos.  ↔ R5
- [ ] (T6) AC6: No existe scroll horizontal involuntario a 320, 375, 768, 1024 y 1440 px; contenido, tablas, navegación y diálogos siguen siendo utilizables.  ↔ R6
- [ ] (T7) AC7: El usuario puede elegir Sistema, Claro u Oscuro; Sistema responde a `prefers-color-scheme` y todos los temas conservan contraste WCAG 2.2 AA y foco equivalente.  ↔ R7
- [ ] (T8) AC8: El tema se aplica antes del primer pintado, persiste entre sesiones y degrada a Sistema si localStorage no está disponible o contiene un valor inválido.  ↔ R8
- [ ] (T9) AC9: Solo se ofrece español mientras no exista una traducción completa; precios, puntos, fechas y horas siguen una configuración efectiva única y documentada.  ↔ R9
- [ ] (T10) AC10: Skeletons, estados vacíos, error y offline mantienen jerarquía, espacio estable y acciones de recuperación coherentes en todos los viewports objetivo.  ↔ R10
- [ ] (T11) AC11: Las pruebas automáticas cubren axe, teclado, foco, cambio de tema, ausencia de destello y overflow en la matriz de viewports aprobada.  ↔ R11
- [ ] (T12) AC12: Typecheck, lint, tests, Playwright de accesibilidad/responsive y diff-scope terminan con código cero.  ↔ R12
- [ ] Tests que cubran los criterios de aceptación
