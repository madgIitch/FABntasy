# Sprint 22B — Despliegue productivo del ingestor

## Estado

Spec propuesta, todavía no aprobada ni autorizada para implementación. Este sprint concentra todo el trabajo de infraestructura y puesta en producción del ingestor Python que queda deliberadamente fuera de los sprints funcionales.

## Objetivo

Desplegar el ingestor como servicio independiente de Vercel, capaz de mantener el scheduler y la cola administrativa activos, sobrevivir reinicios, rotar credenciales FAB y conectarse de forma segura a PostgreSQL y al endpoint interno de lifecycle.

Debe completarse después de observabilidad y antes de la release candidate. La elección del proveedor no se fija en este documento: se decidirá al comenzar el sprint mediante una comparación corta de coste, disponibilidad regional, volumen persistente, proceso continuo, gestión de secretos y operación. No se aceptará una solución que dependa de un portátil, una terminal abierta o ejecuciones manuales rutinarias.

## Punto de partida ya implementado

- Imagen base en `services/fab_ingestor/Dockerfile`.
- CLI `python -m fab_ingestor` con `sync-all`, `run-scheduler`, `run-admin-worker`, `register-device`, `probe-auth` y `grant-ingestion-admin`.
- Scheduler con intervalos de 60–180 minutos en reposo y 5–15 minutos en ventana de jornada, usando `Europe/Madrid`.
- Cola administrativa PostgreSQL, claim mediante `FOR UPDATE SKIP LOCKED`, advisory locks, heartbeat y estados persistidos.
- Reintentos, backoff, circuit breaker y clasificación estable de errores FAB.
- Renovación automática de identidad FAB y sustitución atómica del fichero de credenciales.
- Endpoint web server-side de lifecycle protegido mediante secreto compartido.
- Panel administrativo para observar heartbeat, ejecuciones y jobs en cola.

Nada de lo anterior implica que exista actualmente un ingestor desplegado de forma permanente.

## Arquitectura objetivo

Un único artefacto Docker versionado se ejecutará fuera de Vercel. La solución podrá usar un proceso supervisor con scheduler y consumidor de jobs, o dos procesos construidos desde la misma imagen, siempre que:

- haya exactamente un scheduler activo por entorno;
- uno o varios consumidores puedan reclamar jobs sin duplicarlos;
- los procesos reciban `SIGTERM`, dejen de reclamar trabajo y cierren conexiones limpiamente;
- el servicio no escale a cero ni congele CPU mientras debe emitir heartbeat;
- el fichero de credenciales FAB viva en un volumen persistente, privado y escribible, montando el directorio completo y no un JSON de solo lectura;
- PostgreSQL sea la fuente de verdad para runs, jobs y heartbeat;
- Vercel solo sirva la PWA/API y nunca ejecute la ingesta FAB.

El sprint debe decidir explícitamente entre un proceso combinado o dos servicios. Si se usan dos, solo el proceso que necesite rotar FAB podrá escribir el volumen, o ambos deberán compartir un mecanismo de exclusión compatible con el almacenamiento elegido.

## Configuración y secretos

Inventario mínimo para producción:

| Variable | Destino | Tratamiento |
| --- | --- | --- |
| `FAB_MODE=live` | Ingestor | Configuración server-side |
| `DATABASE_URL` | Ingestor | Secreto; conexión PostgreSQL con TLS y pool/límites documentados |
| `FAB_CREDENTIALS_FILE` | Ingestor | Ruta dentro del volumen persistente escribible |
| `FAB_AUTO_CREDENTIAL_REFRESH=true` | Ingestor | Configuración; permite renovación controlada |
| `FAB_ACTIVE_SEASON` | Ingestor | Configuración operacional |
| `FAB_SCHEDULER_IDLE_MINUTES` | Ingestor | Entre 60 y 180 |
| `FAB_SCHEDULER_ACTIVE_MINUTES` | Ingestor | Entre 5 y 15 |
| `FAB_JOURNEY_WINDOWS` | Ingestor | Ventanas documentadas en `Europe/Madrid` |
| `FAB_REQUEST_TIMEOUT_SECONDS` | Ingestor | Entre 1 y 30 |
| `FAB_RETRY_ATTEMPTS` | Ingestor | Entre 1 y 5 |
| `FAB_RETRY_INITIAL_DELAY_SECONDS` | Ingestor | Configuración operacional |
| `FAB_RETRY_MAX_DELAY_SECONDS` | Ingestor | Configuración operacional |
| `FAB_CIRCUIT_FAILURE_THRESHOLD` | Ingestor | Entre 1 y 10 |
| `FAB_CIRCUIT_RECOVERY_SECONDS` | Ingestor | Entre 30 y 3600 |
| `CANASTIO_FANTASY_LIFECYCLE_URL` | Ingestor | URL HTTPS de `/api/internal/fantasy/lifecycle` |
| `CANASTIO_INTERNAL_JOB_SECRET` | Ingestor y Vercel | Secreto compartido, idéntico en ambos lados y rotatable |

`FAB_DEVICE_ID` y `FAB_KEY` solo pueden usarse para bootstrap controlado. La operación normal debe leer y rotar el fichero persistente. Ninguna variable FAB, URL de base de datos o secreto interno puede aparecer en la imagen, el repositorio, argumentos visibles del proceso, logs, métricas, panel web o artefactos de CI.

## Trabajo pendiente

1. Comparar al menos dos destinos compatibles y registrar una ADR con proveedor, región, coste estimado, límites, persistencia, backups del volumen y procedimiento de acceso de emergencia.
2. Definir IaC o configuración reproducible en `infrastructure/`; no depender de pasos irrepetibles en una consola web.
3. Endurecer y probar el Dockerfile: usuario sin privilegios, dependencias fijadas, healthcheck, señal de parada, imagen pequeña, sin secretos ni archivos locales.
4. Definir el entrypoint productivo para ejecutar scheduler y consumidor de jobs con supervisión clara y sin crear dos schedulers por accidente.
5. Crear el servicio, región, política de reinicio, CPU/memoria, concurrencia y volumen persistente escribible.
6. Provisionar secretos en el gestor del proveedor y sincronizar exclusivamente el secreto compartido necesario con Vercel.
7. Inicializar o importar la identidad FAB en el volumen, ejecutar `probe-auth` y demostrar una rotación atómica tras reinicio.
8. Configurar `DATABASE_URL` con TLS, límites de conexiones y acceso de red adecuado para Supabase/PostgreSQL.
9. Configurar la URL HTTPS de lifecycle y verificar autenticación correcta, rechazo sin secreto y rotación del secreto sin pérdida de jobs.
10. Aplicar las migraciones pendientes mediante un paso de release separado; el proceso del ingestor no ejecutará migraciones automáticamente al arrancar.
11. Conceder el primer `INGESTION_ADMIN` por CLI/SQL controlado y verificar que no existe autoconcesión pública.
12. Ejecutar un smoke de `sync-all`, un job GAME, uno ROUND y uno COMPETITION; comprobar idempotencia, runs, contadores y ausencia de duplicados.
13. Verificar scheduler activo, heartbeat, jobs atascados, recuperación tras reinicio y comportamiento cuando FAB, PostgreSQL o lifecycle no están disponibles.
14. Integrar logs estructurados, métricas y alertas del Sprint 22 sin payloads, tokens ni credenciales.
15. Añadir CI/CD con build, análisis, publicación por digest, despliegue controlado y rollback a la imagen anterior.
16. Crear runbooks de alta, despliegue, rollback, reinicio, rotación de secretos/FAB, cola atascada, caída de dependencias y restauración del volumen.
17. Registrar costes y límites operativos, responsable, canal de alertas y frecuencia de revisión.
18. Ejecutar la suite transaccional de correcciones sobre una PostgreSQL efímera con el esquema productivo: preview sin mutación, apply atómico, confirmaciones concurrentes, idempotencia, reversión compensatoria, fallo y reintento del recálculo y protección frente a un UPSERT posterior del ingestor.

## Criterios de aceptación

1. El proveedor y la topología quedan documentados mediante ADR, con coste, región, persistencia, límites y motivo de elección.
2. La infraestructura productiva puede recrearse desde configuración versionada y secretos externos, sin copiar credenciales al repositorio.
3. La imagen se ejecuta como usuario no root, no contiene secretos y queda identificada por commit y digest inmutable.
4. Existe exactamente un scheduler activo y el consumidor procesa la cola administrativa de forma continua sin depender de Vercel.
5. El servicio no escala a cero durante su periodo operativo y emite heartbeat dentro del umbral HEALTHY esperado.
6. `FAB_CREDENTIALS_FILE` reside en un directorio persistente y escribible; las credenciales siguen disponibles tras redeploy/restart y una renovación se persiste atómicamente.
7. `DATABASE_URL` usa transporte seguro y un presupuesto de conexiones compatible con el pool de PostgreSQL; un fallo de DB no provoca un bucle agresivo.
8. Lifecycle usa HTTPS y el mismo `CANASTIO_INTERNAL_JOB_SECRET` en ingestor y Vercel; una petición ausente o incorrecta se rechaza sin filtrar información.
9. Las migraciones se aplican antes del despliegue del proceso y un fallo de migración impide promover la release sin modificar datos desde el startup del worker.
10. Un `sync-all` real y los jobs GAME, ROUND y COMPETITION terminan o fallan con códigos seguros; repetirlos no duplica entidades ni resultados.
11. Reiniciar o desplegar durante reposo no pierde jobs; durante un trabajo activo no causa dos escrituras concurrentes y deja un estado diagnosticable.
12. La caída simulada de FAB, PostgreSQL y lifecycle activa backoff/alerta y conserva datos ya sincronizados y jobs recuperables.
13. Logs, métricas, CI y panel no contienen `FAB_DEVICE_ID`, `FAB_KEY`, `DATABASE_URL`, `CANASTIO_INTERNAL_JOB_SECRET`, cookies, cabeceras de autorización ni payloads RAW.
14. Existe alerta por heartbeat STALE, backlog QUEUED, job FAILED y ciclo programado fallido, con enlace al runbook correspondiente.
15. El pipeline despliega una imagen testeada por digest y permite rollback probado sin revertir migraciones destructivamente.
16. Los runbooks permiten a otro operador desplegar, diagnosticar, rotar secretos y recuperar el servicio sin conocimiento tribal.
17. La release candidate depende de este sprint y no puede comenzar hasta completar un smoke productivo documentado.
18. La suite de correcciones pasa contra una PostgreSQL aislada creada desde cero y demuestra que ninguna prueba usa la base de producción, FAB real ni credenciales reales; conserva evidencia de migración, rollback transaccional, conflicto concurrente, reintento y limpieza del entorno efímero.

## Pruebas y evidencias requeridas

- Tests unitarios Python y de configuración sin FAB real.
- Test de integración PostgreSQL para locks, jobs, heartbeat y reconexión.
- Test de integración PostgreSQL para el ciclo completo de revisiones deportivas: propuesta, aplicación, concurrencia, idempotencia, recomputación, reversión y protección de overrides frente al ingestor.
- Build y escaneo de la imagen Docker.
- Inspección automática de imagen y logs para detectar secretos.
- Prueba de reinicio y redeploy conservando el volumen.
- Prueba de graceful shutdown con un job activo.
- Smoke real acotado contra la competición seleccionada, ejecutado solo con aprobación operativa.
- Evidencias de alertas, dashboard, rollback y consumo de conexiones.
- Checklist firmado con fecha, versión, digest, entorno y resultado; nunca con valores secretos.

## Fuera de alcance

- Cambiar contratos o scraping de FAB salvo corrección imprescindible para desplegar.
- Añadir nuevas features de fantasy o del panel admin.
- Ejecutar Python dentro de funciones Vercel.
- Alta disponibilidad multi-región.
- Kubernetes por defecto.
- Guardar credenciales FAB únicamente como variables inmutables si eso impide su rotación persistente.
- Desplegar o modificar producción durante la fase de especificación.

## Rollback y recuperación

El rollback cambia el servicio al digest anterior y conserva base de datos, cola y volumen. Las migraciones de este sprint deben ser aditivas; cualquier rollback de datos requiere procedimiento explícito y backup verificado. Si una versión nueva deja un job RUNNING, el operador sigue el runbook: inspecciona heartbeat y lock, detiene la versión defectuosa, decide de forma auditada si cancelar o reencolar y solo entonces restaura el consumidor.

## Dependencias

- Sprint 17 — Ingestion Admin.
- Sprint 19 — Security and Privacy Hardening.
- Sprint 20 — Performance and Reliability.
- Sprint 22 — Beta Observability.

Bloquea Sprint 23 — Release Candidate.
