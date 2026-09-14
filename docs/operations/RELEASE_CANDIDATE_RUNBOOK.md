# Sprint 23 — Release Candidate

La RC solo puede certificarse con una jornada publicada real de la **1ª Provincial Senior Masculina de Sevilla 2026/2027**, identificada mediante IDs FAB. Los escenarios 14F validan determinismo y degradación, pero nunca sustituyen el smoke real.

## 1. Preflight

1. Copiar `RELEASE_CANDIDATE_MANIFEST.example.json` a una ubicación privada de evidencia.
2. Completar IDs FAB, jornada, ruleset, ligas de prueba, commit, digests y responsables. No incluir emails, credenciales, cookies, cabeceras ni RAW.
3. Fijar como rollback el último despliegue productivo estable anterior, con release, commit y digest separados para web e ingestor.
4. Confirmar que el barrido de calendario terminó sin `PARTIAL` ni `FAILED` y reconciliar todos los partidos esperados.

## 2. Vertical real

Ejecutar ingesta de calendario y boxscores, lifecycle, publicación y ranking. Reconciliar Game y PlayerGameStat/revisión con FantasyPlayerGameScore, titulares, RoundTeamScore, ranking global y cada liga privada declarada. Las consultas deben devolver cero diferencias.

Repetir el mismo partido secuencialmente y con dos solicitudes concurrentes. Scores, revisiones, precios y notificaciones deduplicables no aumentan; cada intento administrativo conserva un evento de auditoría propio.

## 3. Corrección y degradación

Una corrección cambia el hash, conserva la revisión anterior y publica atómicamente una sola revisión nueva. Un fallo anterior al commit mantiene la última publicación. Aplazado y final sin boxscore quedan `PENDING`; parcial conserva `null`; DNP confirmado vale cero.

## 4. Matriz E2E

Ejecutar las versiones de Chromium, Firefox y WebKit fijadas por Playwright en `pnpm-lock.yaml`, a 375×812 y 1440×900. Cubrir autenticación, liga, mercado/roster, lineup/cutoff, jornada parcial, publicación/ranking, corrección/republicación y degradación. Fallan la RC: overflow, infracciones axe `critical`/`serious` y consola fuera de una allowlist fechada con motivo, responsable y caducidad.

La ejecución privada requiere `E2E_STORAGE_STATE`, `E2E_GAME_WITH_STATS_ID`, `E2E_GAME_WITHOUT_STATS_ID` y `E2E_PLAYER_ID`. Una prueba omitida no cuenta como aprobada en el informe RC.

## 5. Defectos y rollback

Un bloqueo de flujo crítico, pérdida/corrupción o vulnerabilidad crítica es `BLOCKER` y no se acepta. Resultado incorrecto, fallo de autorización, duplicación económica o degradación grave sin alternativa segura es `HIGH`; solo el responsable de release puede aceptarlo con mitigación, aprobador y caducidad.

El rollback restaura ambos digests baseline, preserva datos y revisiones y verifica lectura de la última publicación. Un job interrumpido se diagnostica por heartbeat, lock y eventos antes de reencolarlo de forma auditada.
