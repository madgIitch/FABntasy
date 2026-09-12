# Sprint 18C — Evidencia de QA

## Resultado

- 90 capturas generadas: 15 estados/superficies × 6 anchos (320, 375, 400, 430, 768 y 1440 px).
- Inicio se verificó en estados ordinario, live, final reciente y degradado con mercado vacío, error aislado y nombres largos.
- No se detectaron errores de página ni overflow horizontal.
- El caso degradado de Inicio tampoco presenta overflow con zoom del 200 %.
- `prefers-reduced-motion` elimina la animación de entrada.
- Evidencia local generada en `.local/14e-qa/captures/`.

## Contraste

Sprint 18C conserva sin cambios los tokens bosque-lima medidos en Sprint 14E: texto principal 13.17:1, secundario 7.42:1, sutil 5.47:1, lima sobre superficie 12.89:1 y texto bosque sobre CTA lima 15.39:1. Todos superan los umbrales 4.5:1 para texto normal y 3:1 para texto grande o gráficos.

## Gates

- TypeScript, ESLint y 101 tests web: aprobados.
- Build de producción Next.js: aprobado; mantiene un warning preexistente de Autoprefixer en `fantasy-team-manager.module.css`.
- Prisma: esquema válido.
- Python: 71 tests aprobados y 5 integraciones omitidas sin base configurada; Ruff aprobado.
- Suite SQL: manifiesto y runner aprobados; cinco escenarios de integración omitidos al no existir base de test configurada.
