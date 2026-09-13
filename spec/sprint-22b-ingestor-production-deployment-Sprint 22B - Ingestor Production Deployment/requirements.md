# sprint-22b-ingestor-production-deployment · undefined — Requisitos

- name: `Sprint 22B - Ingestor Production Deployment` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-13T23:29:43.696Z

## Contexto



## Requisitos funcionales

R1. Una ADR aprobada compara al menos dos destinos y fija proveedor, región, topología, coste mensual estimado, CPU/memoria, límites, política de reinicio, no-scale-to-zero, volumen, backups, acceso de emergencia y motivo de elección.
R2. Desde configuración versionada y una cuenta vacía del proveedor se recrean servicio, red, volumen, alertas y pipeline; una inspección automática confirma que repositorio, imagen y configuración versionada no contienen secretos.
R3. La imagen testeada ejecuta con UID/GID no root, incorpora el commit como metadato, se despliega por digest inmutable y, ante SIGTERM durante un job, deja de reclamar trabajo, cierra conexiones y termina dentro del grace period aprobado.
R4. Una prueba de exclusión demuestra durante una ventana documentada que existe exactamente un scheduler activo; el worker permanece ejecutándose fuera de Vercel, no escala a cero y drena jobs QUEUED continuamente.
R5. En operación normal el heartbeat permanece HEALTHY según los umbrales de Sprint 22; pruebas sintéticas disparan y posteriormente resuelven alertas deduplicadas por heartbeat STALE, backlog superior a 20 durante 10 minutos, job FAILED y ciclo programado fallido.
R6. FAB_CREDENTIALS_FILE apunta a un archivo dentro de un directorio persistente privado y escribible; una renovación usa sustitución atómica y el mismo estado válido permanece disponible después de restart y redeploy.
R7. DATABASE_URL exige TLS y el ADR documenta el presupuesto total de conexiones por réplica frente al límite de PostgreSQL; una indisponibilidad simulada aplica backoff acotado, no genera un bucle agresivo, no pierde jobs ni modifica datos ya confirmados.
R8. Lifecycle usa una URL HTTPS; una prueba con el secreto correcto completa la llamada y pruebas sin secreto o con secreto incorrecto reciben una respuesta segura sin diferencias reveladoras ni filtración en logs. La rotación coordinada con Vercel no pierde jobs.
R9. Las migraciones se ejecutan como job de release independiente usando la conexión prevista para migraciones; un fallo detiene la promoción y se verifica que scheduler y worker no ejecutan migraciones al arrancar.
R10. Con aprobación operativa, un smoke real acotado ejecuta sync-all y jobs GAME, ROUND y COMPETITION; cada ejecución registra estado, duración y contadores saneados, y una segunda ejecución conserva los mismos cardinales y claves naturales sin duplicados.
R11. Pruebas de restart y redeploy tanto en reposo como durante un job demuestran que no se pierden jobs, los advisory locks impiden dos escrituras concurrentes y cualquier RUNNING interrumpido conserva estado, timestamps y código diagnóstico accionable.
R12. Inyecciones controladas de caída de FAB, PostgreSQL y lifecycle verifican los estados, códigos, backoff, alertas y recuperación definidos, manteniendo datos confirmados y jobs recuperables.
R13. Un escaneo automatizado de imagen, logs, métricas, artefactos CI y respuestas del panel falla si encuentra credenciales FAB, DATABASE_URL, secreto interno, cookies, Authorization o payloads RAW, incluyendo variantes de mayúsculas y valores señuelo.
R14. CI construye una vez, ejecuta tests y escaneo sobre esa imagen, publica su digest y promueve exactamente ese digest; una prueba documentada restaura el digest anterior conservando base, cola y volumen y sin revertir migraciones destructivamente.
R15. Los runbooks permiten a un operador distinto desplegar, diagnosticar HEALTHY/DEGRADED/STALE, rotar ambos tipos de secretos, resolver cola atascada, restaurar el volumen y ejecutar rollback siguiendo comandos y criterios de verificación reproducibles.
R16. La suite de correcciones crea PostgreSQL efímera desde cero, aplica todas las migraciones y prueba preview sin mutación, apply atómico, conflicto concurrente, idempotencia, reversión compensatoria, fallo y reintento del recálculo y protección de overrides; bloquea URLs de producción y cualquier acceso a FAB o credenciales reales.
R17. Sprint 23 permanece bloqueado hasta adjuntar evidencia fechada y saneada con entorno, commit, digest, competición acotada, resultados del smoke, alertas verificadas, rollback probado y checklist firmado por el responsable operativo.

## Restricciones

- **error_states:** FAB realiza 3 intentos con backoff exponencial de 1/2 s, acotado a 8 s, abre el circuito tras 3 fallos y prueba recuperación a los 300 s; persiste FAILED con código estable y conserva el último dato válido. PostgreSQL reconecta con backoff 1/2/4/8/16 s, continuando de forma acotada hasta 60 s, no reclama nuevos jobs durante la caída ni altera los persistidos; el heartbeat pasa a STALE al superar 10 minutos. Lifecycle realiza 3 intentos con el mismo backoff acotado, no publica resultados parciales y deja el job o recálculo diagnosticable y reintentable. Cada dependencia alerta al cruzar los umbrales del Sprint 22 y vuelve a HEALTHY solo con heartbeat reciente, ausencia de jobs bloqueados y error rate/p95 bajo umbral; recuperación y alerta son explícitas y deduplicadas.
- **auth_secrets:** Define secretos externos, volumen privado escribible, TLS, secreto compartido con Vercel, rechazo seguro, rotación y prohibición de secretos en imagen, repositorio, argumentos, logs, métricas, panel y CI. FAB_CREDENTIALS_FILE reside en un volumen privado de 1 GB y sus backups diarios saneados se retienen 7 días.
- **rollback_compat:** El rollback restaura el digest anterior conservando PostgreSQL, cola y volumen; prohíbe migraciones destructivas y prescribe diagnóstico auditado para jobs RUNNING interrumpidos. La política on-failure se limita a 5 reinicios consecutivos y después alerta, evitando reinicios indefinidos que oculten una release defectuosa.

