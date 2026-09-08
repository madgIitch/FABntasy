# Sprint 14E — Evidencia de QA

## Resultado

- 50 capturas generadas: 10 familias × 5 anchos (320, 375, 430, 768 y 1440 px).
- Sin errores de página ni overflow horizontal detectado.
- Smoke visual/funcional aprobado para registro, onboarding, navegación, Mercado, diálogo y restauración de foco, filtros, tabs de Mi equipo, perfil, abandono de liga, reduced motion y zoom 200 %.
- Evidencia local generada en `.local/14e-qa/captures/`.

## Contraste medido

| Par | Ratio |
| --- | ---: |
| Texto principal / superficie | 13.17:1 |
| Texto secundario / superficie | 7.42:1 |
| Texto sutil / canvas | 5.47:1 |
| Lima / superficie | 12.89:1 |
| Texto bosque / CTA lima | 15.39:1 |
| Danger / superficie | 5.02:1 |
| Warning / superficie | 7.13:1 |

## Checks

- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado.
- `npm test`: 15 archivos y 54 tests aprobados.
- `corepack pnpm --filter @fabntasy/web exec next build`: aprobado. Durante el prerender, la base Supabase no estaba accesible; la ruta usa su degradación prevista y el build finalizó correctamente.

## Auditoría de alcance

Los cambios de producción se limitan a tokens, color, fondos, shaders, sombras, bordes, metadatos cromáticos PWA y el tratamiento cromático del logo. No se modificaron layout, dimensiones, contenido, navegación, lógica de negocio ni contratos.
