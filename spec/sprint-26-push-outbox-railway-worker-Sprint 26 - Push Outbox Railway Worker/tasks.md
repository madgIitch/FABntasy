# sprint-26-push-outbox-railway-worker · Entrega automática de notificaciones mediante outbox y Railway — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) Los productores de mercado, alineación/cutoff, liga y jornada insertan eventos idempotentes en una outbox dentro de la misma transacción de negocio o mediante una operación atómica equivalente.  ↔ R1
- [ ] (T2) La outbox persiste únicamente el payload mínimo necesario, estado, eventKey, intentos, nextAttemptAt y timestamps, con restricción única que impide duplicados.  ↔ R2
- [ ] (T3) Railway recibe un aviso autenticado que solo actúa como wake-up, reclama lotes mediante SKIP LOCKED y llama al dispatcher HTTPS de Vercel con CANASTIO_PUSH_JOB_SECRET.  ↔ R3
- [ ] (T4) Un barrido al arrancar y cada 60 segundos recupera eventos cuyo webhook se perdió; no existe polling más frecuente en reposo.  ↔ R4
- [ ] (T5) Fallos transitorios respetan el backoff de 1, 5 y 15 minutos y un máximo de tres intentos; los fallos permanentes terminan sin bucle y quedan observables sin PII.  ↔ R5
- [ ] (T6) El webhook usa CANASTIO_PUSH_WAKE_SECRET, distinto del secreto del dispatcher, y ningún secreto o payload sensible aparece en logs, métricas, respuestas o repositorio.  ↔ R6
- [ ] (T7) La configuración de Railway documenta DATABASE_URL, CANASTIO_PUSH_DISPATCH_URL, CANASTIO_PUSH_JOB_SECRET y CANASTIO_PUSH_WAKE_SECRET; las claves VAPID permanecen exclusivamente en Vercel.  ↔ R7
- [ ] (T8) Pruebas deterministas cubren inserción idempotente, wake-up, webhook perdido, dos workers concurrentes, recuperación tras reinicio, backoff, entrega y fallos permanentes.  ↔ R8
- [ ] (T9) Typecheck, lint, tests Python y TypeScript, Prisma validate y diff-scope finalizan con código cero.  ↔ R9
- [ ] Tests que cubran los criterios de aceptación
