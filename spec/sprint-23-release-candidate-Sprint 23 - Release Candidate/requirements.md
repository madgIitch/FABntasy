# sprint-23-release-candidate · undefined — Requisitos

- name: `Sprint 23 - Release Candidate` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-14T13:33:55.010Z

## Contexto



## Requisitos funcionales

R1. Se identifica antes de ejecutar la RC una competición, temporada y jornada reales, junto con sus IDs FAB, ventana temporal, ruleset activo, ligas de prueba y responsables; estos datos quedan en un manifiesto de ejecución saneado.
R2. La jornada seleccionada completa ingesta de calendario y boxscores, generación de revisiones de estadísticas, fantasy scores de jugadores, puntuaciones de titulares, total de equipo, ranking global y rankings de todas las ligas privadas incluidas en el manifiesto; una reconciliación automática devuelve cero diferencias entre cada nivel y sus inputs versionados.
R3. Repetir secuencialmente y en concurrencia la ingesta y el cálculo del mismo partido con idénticos inputs no aumenta el número de estadísticas vigentes, fantasy scores vigentes, revisiones de jornada, entradas económicas, precios ni notificaciones deduplicables; las constraints y consultas de reconciliación devuelven cero duplicados. Cada intento administrativo sí genera su propio evento de auditoría.
R4. Una corrección FAB que cambie al menos una estadística crea una nueva revisión con hash de inputs distinto, conserva la revisión anterior como auditable, enlaza actor u origen, timestamps y diff, recalcula de forma atómica los fantasy scores, team scores y ranking afectados y deja una única revisión vigente.
R5. Si el recálculo corregido falla antes del commit, continúa visible la última revisión publicada completa; el reintento converge al mismo resultado sin filas parciales ni duplicadas.
R6. Un partido sin boxscore o con estadísticas requeridas incompletas conserva valores desconocidos como null, muestra un estado textual estable de pendiente o no calculable, no los transforma en cero, no bloquea la lectura del resto de la jornada y no publica como definitivo un total incoherente.
R7. Se verifican explícitamente estos resultados: partido aplazado y partido final sin boxscore quedan PENDING y no publicables; boxscore parcial permanece provisional con desconocidos null; DNP confirmado puntúa cero según el ruleset; corrección durante publicación se serializa o reintenta y deja una revisión vigente; doble resync converge sin duplicados; fallo previo a publicación revierte y conserva la última publicación completa.
R8. Solicitar resync y aplicar o revertir correcciones exige INGESTION_ADMIN; publicar resultados exige el servicio interno server-side autorizado; aceptar excepcionalmente un defecto alto exige al responsable de release designado y, cuando sea posible, un aprobador distinto. Cada intento permitido o rechazado queda auditado y ninguna respuesta, log, captura o artefacto contiene credenciales, cabeceras de autorización, payload RAW no redactado ni PII real.
R9. Los flujos E2E críticos incluyen autenticación, crear o unirse a liga privada, mercado y roster, guardar y bloquear alineación, seguir jornada parcial, ver publicación y ranking, ejecutar corrección autorizada, comprobar republicación y consultar estados degradados.
R10. La matriz E2E usa las versiones de Chromium, Firefox y WebKit incluidas en la versión de Playwright fijada por el lockfile del candidato y ejecuta los flujos críticos al menos en 375x812 y 1440x900; todos pasan sin overflow horizontal, errores o excepciones de consola fuera de una allowlist con motivo, responsable y caducidad, ni infracciones axe critical o serious.
R11. La validación real produce un informe fechado con release y digests desplegados, manifiesto de jornada, tiempos por fase, IDs de runs, revisiones antes y después, resultados de reconciliación, matriz E2E, evidencias saneadas y enlaces a incidencias.
R12. Existe un registro único de defectos con severidad, impacto, reproducción, responsable y estado. Es bloqueante si impide un flujo crítico, causa corrupción o pérdida de datos o una vulnerabilidad crítica; es alto si causa resultados incorrectos, fallo de autorización, duplicación económica o degradación grave sin alternativa segura. La RC queda bloqueada ante ambos salvo aceptación del responsable de release con mitigación, aprobador y caducidad.
R13. Las migraciones de la RC son aditivas o compatibles con la versión anterior; un ensayo documentado revierte web e ingestor al último despliegue productivo estable anterior, identificado para cada uno por release, commit y digest, conservando datos reales, revisiones publicadas y auditoría, y define cómo diagnosticar o reanudar jobs interrumpidos.
R14. Typecheck, lint, tests web, pytest, ruff, Prisma validate, pruebas PostgreSQL de idempotencia y corrección, matriz E2E, auditoría de dependencias y diff-scope terminan con código cero en el commit candidato.

## Restricciones

- **error_states:** Los datos ausentes permanecen null y usan los estados y códigos estables PENDING, NOT_CALCULABLE, INSUFFICIENT_NORMALIZATION_SAMPLE y MISSING_REQUIRED_STAT cuando corresponda. Los fallos de recálculo o publicación son auditables y reintentables, no sustituyen la última revisión completa publicada y nunca exponen resultados parciales como definitivos.
- **auth_secrets:** Las lecturas privadas exigen sesión y pertenencia; resync y correcciones requieren INGESTION_ADMIN, origen validado y auditoría, y la publicación utiliza un actor o servicio server-side autorizado. Solo el responsable de release designado puede aceptar riesgos altos. Logs, trazas, capturas e informes deben excluir credenciales FAB, tokens, cookies, Authorization, secretos de despliegue, payload RAW no redactado, correos reales y demás PII.
- **rollback_compat:** Web e ingestor se despliegan por digest y el ensayo restaura el digest anterior sin borrar datos, revisiones ni auditoría. Las migraciones son aditivas y compatibles con la versión previa. Los jobs interrumpidos se diagnostican mediante heartbeat, lock y eventos, se detienen ordenadamente y solo se reencolan de forma auditada cuando no existe lock.
