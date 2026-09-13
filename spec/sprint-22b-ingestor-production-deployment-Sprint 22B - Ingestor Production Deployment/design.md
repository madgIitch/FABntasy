# sprint-22b-ingestor-production-deployment · undefined — Diseño

## Scope (archivos que puede tocar)

- `infrastructure/**`
- `services/fab_ingestor/**`
- `.github/workflows/**`
- `prisma/migrations/**`
- `tests/**`
- `scripts/**`
- `docs/operations/**`
- `docs/ARCHITECTURE.md`
- `docs/CONVENTIONS.md`
- `docs/DECISIONS.md`
- `.env.example`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** No requiere un nuevo modelo de dominio: PostgreSQL sigue siendo la fuente de verdad para runs, jobs y heartbeat; locks, revisiones y overrides ya están definidos. Cualquier migración de despliegue debe ser aditiva, ejecutarse como job de release independiente y nunca durante el arranque.
- **external_contracts:** El destino queda fijado en Railway Hobby, región EU West/Amsterdam o la región europea disponible más próxima a PostgreSQL registrada en la ADR. La topología es un único servicio y una sola réplica, sin serverless ni scale-to-zero, con supervisor PID 1, exactamente un scheduler y un worker. Los límites iniciales son 1 vCPU, 512 MiB de RAM, una conexión PostgreSQL persistente por proceso y máximo 4 conexiones totales incluyendo releases. El volumen privado es de 1 GB, con backup diario saneado, retención de 7 días y restauración probada. El coste esperado es 5 USD/mes, con alerta en 7 USD y techo operativo de 12 USD; cambiar plan, región o límites exige actualizar la ADR.
- **edge_cases:** Contempla reinicio durante jobs activos, scheduler duplicado, pérdida temporal de dependencias, jobs RUNNING interrumpidos, renovación atómica de credenciales, repetición idempotente y concurrencia. El supervisor PID 1 garantiza exactamente un scheduler y un worker, propaga SIGTERM y reinicia procesos; la política on-failure admite como máximo 5 reinicios consecutivos antes de alertar.
- **ui_states:** No añade UI funcional; reutiliza el panel administrativo existente, autorizado server-side, que representa HEALTHY, DEGRADED y STALE, backlog, jobs fallidos o bloqueados, latencias y frescura. La vuelta a HEALTHY exige heartbeat reciente, ausencia de jobs bloqueados y error rate/p95 bajo los umbrales del Sprint 22.

## Decisiones de la entrevista

- **adv-bbea3d6f13:** ### [adv-50e7b6f268] No se fija el grace period máximo para SIGTERM ni dónde queda aprobado; una terminación limpia en distintos plazos podría considerarse PASS o FAIL.

**R:**
- **adv-1a7e51f59a:** ### [adv-9aad4fae99] No se definen la frecuencia mínima ni la latencia máxima aceptable para «drena jobs QUEUED continuamente»; un worker que procese esporádicamente podría pasar o fallar según la interpretación.

**R:**
- **adv-f354951bd2:** ### [adv-67fe7a06ad] «Backoff acotado» y «bucle agresivo» no tienen valores máximos/mínimos de intentos, intervalo o duración total para PostgreSQL y las demás dependencias.

**R:**
- **adv-80d657372c:** ### [adv-7b6ad1de81] No se define el comportamiento exigido para un job RUNNING interrumpido: permanecer RUNNING, pasar a FAILED, volver a QUEUED o usar otro estado, ni qué timestamps y código diagnóstico concretos deben quedar.

**R:**
- **adv-ee3a7a3c50:** ### [adv-36a19187dc] Las inyecciones de caída exigen estados, códigos, backoff, alertas y recuperación «definidos», pero el criterio no fija esos resultados ni referencia un contrato aprobado que los determine.

**R:**
- **adv-a2f2418c4a:** ### [adv-adf66cce03] No se define quién es el «responsable operativo», qué forma de firma es válida ni qué aprobación operativa autoriza el smoke; no puede decidirse si el checklist y la evidencia satisfacen el cierre.

**R:**
- **error_states:** FAB conserva los contratos actuales: 3 intentos con backoff exponencial 1/2 s limitado a 8 s, circuito abierto tras 3 fallos y prueba de recuperación a los 300 s; persiste `FAILED` con código estable y conserva el último dato válido. PostgreSQL reconecta con backoff 1/2/4/8/16 s limitado a 60 s, no reclama nuevos jobs mientras está caído y no altera los ya persistidos; el heartbeat pasa a `STALE` al superar 10 minutos. Lifecycle realiza 3 intentos con el mismo backoff acotado, deja el job/recalculo diagnosticable y reintentable sin publicar resultados parciales. Cada dependencia alerta al cruzar los umbrales del Sprint 22 y vuelve a `HEALTHY` cuando existe heartbeat reciente, no quedan jobs bloqueados y error rate/p95 están de nuevo bajo umbral; la recuperación emite una señal explícita y deduplicada.
- **external_contracts:** Railway Hobby en región europea (EU West/Amsterdam, o la región europea disponible más próxima a PostgreSQL que quede registrada en la ADR), con un único servicio y una sola réplica. Un supervisor PID 1 ejecuta exactamente un scheduler y un worker, propaga SIGTERM y reinicia cualquiera de los dos procesos; no se habilita serverless/scale-to-zero. Límites iniciales: 1 vCPU y 512 MiB RAM, una sola conexión PostgreSQL persistente por proceso y máximo 4 conexiones totales incluyendo tareas de release. Volumen privado de 1 GB montado como directorio escribible para `FAB_CREDENTIALS_FILE`; backup diario saneado con 7 días de retención y restauración probada. Política de reinicio `on-failure` con máximo 5 reinicios consecutivos y alerta posterior. Presupuesto esperado 5 USD/mes, alerta de coste en 7 USD y techo operativo de 12 USD; cualquier cambio de plan, región o límites requiere actualizar la ADR.
- **tests:** El smoke usa exclusivamente la 1ª Provincial Senior Masculina de Sevilla 2026/2027, una jornada publicada y como máximo tres partidos representativos (programado, en curso y terminado cuando existan), sin inventar tráfico. El scheduler se autorregula desde `games.scheduled_at`, el estado FAB y la finalización validada: 120 minutos sin partidos próximos, 5 minutos desde 60 minutos antes, 30–60 segundos durante juego y reintentos de boxscore final a 2/5/10/20 minutos; al validar todos los finales vuelve a 120 minutos. `FAB_JOURNEY_WINDOWS` queda solo como límite de seguridad/fallback. La observación cubre desde 60 minutos antes del primer partido hasta validar el último, con un máximo de 6 horas; heartbeat menor de 10 minutos, job elegible reclamado en menos de 2 minutos, SIGTERM completado en 10 segundos, cero duplicados tras repetición y recuperación HEALTHY dentro de 10 minutos desde restablecer la dependencia. La evidencia saneada se guarda en `progress/deployment/sprint-22b/<fecha>-<commit>/` con digest, timestamps UTC, contadores, alertas, reinicio, rollback y checklist, nunca secretos ni RAW.

