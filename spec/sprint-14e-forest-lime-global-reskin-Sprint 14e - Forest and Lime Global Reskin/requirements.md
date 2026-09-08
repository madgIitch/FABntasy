# sprint-14e-forest-lime-global-reskin · Sprint 14E - Reskin global bosque y lima — Requisitos

- name: `Sprint 14e - Forest and Lime Global Reskin` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-08T23:13:19.872Z

## Contexto

Spec detallada: docs/design/SPRINT_14E_SPEC.md. Sustituye únicamente la dirección cromática clara de 14D; conserva composición, tipografía, densidad, componentes, responsive y contratos funcionales.

## Requisitos funcionales

R1. Todas las rutas y estados adoptan el sistema bosque oscuro, blanco roto y lima sin superficies claras residuales accidentales.
R2. Layout, dimensiones, espaciado, radios, tipografía, iconografía, contenido, responsive y comportamiento permanecen iguales a 14D.
R3. Los colores compartidos proceden de tokens semánticos y los hardcodes residuales quedan migrados o justificados.
R4. Canvas, superficies y shaders aportan profundidad verde sutil sin neón, glassmorphism, gradientes multicolor ni fondos lima.
R5. Texto y controles cumplen contraste WCAG; foco y estados no dependen exclusivamente del color.
R6. Mercado, cancha, navegación, tabs, formularios, diálogos y estados globales mantienen su semántica y adoptan el nuevo tema.
R7. Se revisan landing, auth, onboarding y todas las rutas privadas a 320, 375, 430, 768 y 1440 px y zoom 200 %.
R8. No se añaden funcionalidades, selector de tema, persistencia, microcopy, APIs, schema, migraciones ni reglas de negocio.
R9. Typecheck, lint, tests, build y smoke tests críticos pasan sin regresión funcional.
R10. El diff de producción se limita a color, fondos, degradados, sombras, bordes y assets cromáticos, salvo excepciones documentadas.

