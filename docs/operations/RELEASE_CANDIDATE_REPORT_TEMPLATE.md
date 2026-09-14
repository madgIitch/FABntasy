# Informe RC — `<fecha>-<commit>`

## Identidad

- Manifiesto/fingerprint:
- Release, commit y digest web:
- Digest ingestor:
- Baseline de rollback (release, commit, digests):
- Responsable de release / operaciones:

## Jornada real

- Competición / temporada / IDs FAB:
- Jornada / ID FAB / ventana Europe/Madrid:
- Ruleset:
- Ligas privadas incluidas:
- Runs de ingesta y lifecycle:
- Calendario completo (`PARTIAL=0`, `FAILED=0`):
- Boxscores `stats_final` / pendientes:

## Reconciliación

- Salida de `tests/release-candidate/reconcile.sql` (cero violaciones):
- Equipos con ranking global:
- Ligas privadas reconciliadas:
- Conteos antes/después del resync secuencial:
- Conteos antes/después del resync concurrente:
- Auditorías administrativas creadas por intento:
- Revisión anterior/nueva tras corrección:
- Resultado del fallo inyectado y reintento:

## E2E y degradación

| Flujo | Chromium 375 | Chromium 1440 | Firefox 375 | Firefox 1440 | WebKit 375 | WebKit 1440 |
| --- | --- | --- | --- | --- | --- | --- |
| Autenticación | | | | | | |
| Liga privada | | | | | | |
| Mercado/roster | | | | | | |
| Lineup/cutoff | | | | | | |
| Jornada parcial | | | | | | |
| Publicación/ranking | | | | | | |
| Corrección/republicación | | | | | | |
| Estado degradado | | | | | | |

- Axe critical/serious:
- Overflow:
- Consola / allowlist vigente:

## Defectos y riesgos

Enlace al registro único. Ningún `BLOCKER` puede aceptarse. Para cada `HIGH` aceptado: mitigación, responsable de release, aprobador y caducidad.

## Rollback

- Restauración de digest web:
- Restauración de digest ingestor:
- Última revisión publicada legible:
- Jobs RUNNING diagnosticados por heartbeat/lock/eventos:
- Reanudación idempotente:

## Gates

- typecheck / lint / test / pytest / ruff / Prisma validate:
- PostgreSQL idempotencia/corrección/concurrencia:
- auditoría de dependencias / diff-scope:
- veredicto final: `PASS` o `BLOCKED`
