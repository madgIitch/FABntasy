# Registro de defectos de Release Candidate

Este archivo es el índice único; cada fila enlaza a la incidencia con reproducción y evidencia saneada.

| ID | Severidad | Impacto | Estado | Responsable | Mitigación | Aceptado por | Aprobador | Caducidad | Incidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RC-SEC-001 | HIGH | PostCSS permite lectura arbitraria mediante `sourceMappingURL` (GHSA-6g55-p6wh-862q) | RESOLVED | Sprint 23 | Override PostCSS 8.5.18; auditoría sin HIGH | — | — | — | `pnpm audit` 2026-09-14 |
| RC-SEC-002 | HIGH | PostCSS permite path traversal al cargar source maps (GHSA-r28c-9q8g-f849) | RESOLVED | Sprint 23 | Override PostCSS 8.5.18; auditoría sin HIGH | — | — | — | `pnpm audit` 2026-09-14 |
| RC-SEC-003 | HIGH | `deepmerge-ts` puede agotar la pila con grafos recursivos (GHSA-ggr8-5vv4-36mx) | RESOLVED | Sprint 23 | Override deepmerge-ts 8.0.0; auditoría sin HIGH | — | — | — | `pnpm audit` 2026-09-14 |

## Taxonomía

- `BLOCKER`: impide un flujo crítico, causa pérdida/corrupción de datos o una vulnerabilidad crítica. No admite excepción en la RC.
- `HIGH`: resultado incorrecto, fallo de autorización, duplicación económica o degradación grave sin alternativa segura. Solo admite excepción del responsable de release, con mitigación, aprobador y caducidad.
- `NORMAL`: cualquier defecto que no cumpla los criterios anteriores; se prioriza sin bloquear automáticamente la RC.
