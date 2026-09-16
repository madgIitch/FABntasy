# sprint-30-railway-immediate-startup-sync · Sincronización inmediata tras desplegar en Railway — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) El comando productivo de Railway continúa siendo `python -m fab_ingestor run-production` y levanta exactamente un proceso `run-scheduler`; no se añade un cron, release command ni segundo servicio que pueda duplicar el ciclo.  ↔ R1
- [x] (T2) Cada arranque del proceso scheduler, incluido deploy, restart manual o recuperación supervisada, invoca una vez `sync_all` antes de realizar la primera espera; la garantía es por arranque de proceso y no exactamente una vez por deployment de Railway.  ↔ R2
- [x] (T3) El ciclo inmediato reutiliza el flujo normal de `sync_all`: actualiza las competiciones monitorizadas y solo ejecuta el barrido global de catálogo cuando la política de frescura vigente lo considera debido; no fuerza tráfico FAB adicional en cada deploy.  ↔ R3
- [x] (T4) El siguiente intervalo se calcula desde el comienzo del ciclo inmediato igual que en los ciclos periódicos; si el trabajo dura más que el intervalo, el siguiente ciclo puede comenzar sin una espera negativa.  ↔ R4
- [x] (T5) Los advisory locks y UPSERT idempotentes existentes siguen siendo obligatorios, de modo que un solapamiento temporal por restart o despliegue no duplica competiciones, equipos, jugadores, partidos, estadísticas ni resultados fantasy.  ↔ R5
- [x] (T6) El ciclo de arranque genera evidencia observable con trigger `STARTUP` o equivalente estable, timestamps, estado y contadores seguros; no expone variables, credenciales FAB, DATABASE_URL, secretos, cabeceras ni payloads RAW.  ↔ R6
- [x] (T7) Un fallo recuperable del primer ciclo se registra con su código seguro y respeta backoff/circuit breaker; no provoca un bucle agresivo de peticiones ni elimina datos sincronizados previamente.  ↔ R7
- [x] (T8) SIGTERM durante el ciclo inmediato propaga la cancelación y permite el cierre dentro de la gracia configurada, dejando un run diagnosticable y sin reclamar trabajo nuevo.  ↔ R8
- [x] (T9) Los tests prueban el orden sync-before-wait, una sola invocación inicial, cadencia posterior, restart del hijo, fallo inicial, cancelación y exclusión concurrente; no requieren Railway ni llamadas reales a FAB.  ↔ R9
- [x] (T10) La documentación de despliegue incluye cómo verificar el run inicial tras un deploy y cómo distinguir un ciclo correcto, fallido, omitido por lock o cancelado.  ↔ R10
- [x] (T11) Los gates Python, lint, tests, Prisma validate y diff-scope aplicables terminan con código cero y se preservan los contratos de Sprints 22B, 22C y 29.  ↔ R11
- [x] Tests que cubran los criterios de aceptación
