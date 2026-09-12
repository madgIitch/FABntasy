# sprint-21-accessibility-responsive-polish · undefined — Requisitos

- name: `Sprint 21 - Accessibility and Responsive Polish` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-12T18:42:36.584Z

## Contexto



## Requisitos funcionales

R1. AC1: Las acciones críticas pueden completarse solo con teclado en desktop, con foco visible y orden determinista.
R2. AC2: Los controles táctiles principales miden al menos 44 × 44 CSS px o disponen de un área de activación equivalente sin solapamientos.
R3. AC3: Los estados loading, empty, offline y error se distinguen mediante texto y semántica accesible, no solo color.
R4. AC4: Los diálogos de compra, venta, invitación y lineup contienen el foco, responden a Escape cuando procede y restauran el foco al disparador.
R5. AC5: Inicio, Mercado, Mi equipo, Jornada, Liga y Perfil no presentan infracciones axe critical o serious en los estados cubiertos.
R6. AC6: No existe scroll horizontal involuntario a 320, 375, 768, 1024 y 1440 px; contenido, tablas, navegación y diálogos siguen siendo utilizables.
R7. AC7: El usuario puede elegir Sistema, Claro u Oscuro; Sistema responde a `prefers-color-scheme` y todos los temas conservan contraste WCAG 2.2 AA y foco equivalente.
R8. AC8: El tema se aplica antes del primer pintado, persiste entre sesiones y degrada a Sistema si localStorage no está disponible o contiene un valor inválido.
R9. AC9: Solo se ofrece español mientras no exista una traducción completa; precios, puntos, fechas y horas siguen una configuración efectiva única y documentada.
R10. AC10: Skeletons, estados vacíos, error y offline mantienen jerarquía, espacio estable y acciones de recuperación coherentes en todos los viewports objetivo.
R11. AC11: Las pruebas automáticas cubren axe, teclado, foco, cambio de tema, ausencia de destello y overflow en la matriz de viewports aprobada.
R12. AC12: Typecheck, lint, tests, Playwright de accesibilidad/responsive y diff-scope terminan con código cero.
R13. AC13: `/app/perfil` funciona como hub breve y enlaza Cuenta, Apariencia e idioma, Notificaciones, Seguridad y Privacidad y datos sin incrustar sus formularios.
R14. AC14: Correo, contraseña y sesiones viven en subrutas con encabezado de retorno; no se muestra funcionalidad MFA mientras no esté disponible.
R15. AC15: Notificaciones muestra por separado capacidad, permiso del navegador y registro del dispositivo antes de los interruptores, con errores accionables.
R16. AC16: La instalación PWA solo aparece cuando existe una acción útil: prompt instalable o instrucciones manuales reales para iOS no instalado.
R17. AC17: Privacidad muestra el estado de encontrabilidad mediante un switch que se persiste al cambiar y la exportación como fila descargable.
R18. AC18: La eliminación exige escribir manualmente el username, contraseña válida, habilita la acción solo al completar ambos requisitos y presenta una confirmación modal final.
R19. AC19: El hub y todas sus subrutas son utilizables a 320 px sin overflow ni solapamiento con la navegación inferior.
