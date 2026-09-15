# sprint-26-push-outbox-railway-worker · Entrega automática de notificaciones mediante outbox y Railway — Requisitos

- name: `Sprint 26 - Push Outbox Railway Worker` · priority: P1 · sdd: false
- aprobado por: peorr · 2026-09-15T00:30:29.699Z

## Contexto

Conectar los eventos de dominio a una outbox transaccional en Supabase y procesarlos desde el worker permanente de Railway, con activación inmediata por webhook y barrido periódico de respaldo.

## Requisitos funcionales

R1. Los productores de mercado, alineación/cutoff, liga y jornada insertan eventos idempotentes en una outbox dentro de la misma transacción de negocio o mediante una operación atómica equivalente.
R2. La outbox persiste únicamente el payload mínimo necesario, estado, eventKey, intentos, nextAttemptAt y timestamps, con restricción única que impide duplicados.
R3. Railway recibe un aviso autenticado que solo actúa como wake-up, reclama lotes mediante SKIP LOCKED y llama al dispatcher HTTPS de Vercel con CANASTIO_PUSH_JOB_SECRET.
R4. Un barrido al arrancar y cada 60 segundos recupera eventos cuyo webhook se perdió; no existe polling más frecuente en reposo.
R5. Fallos transitorios respetan el backoff de 1, 5 y 15 minutos y un máximo de tres intentos; los fallos permanentes terminan sin bucle y quedan observables sin PII.
R6. El webhook usa CANASTIO_PUSH_WAKE_SECRET, distinto del secreto del dispatcher, y ningún secreto o payload sensible aparece en logs, métricas, respuestas o repositorio.
R7. La configuración de Railway documenta DATABASE_URL, CANASTIO_PUSH_DISPATCH_URL, CANASTIO_PUSH_JOB_SECRET y CANASTIO_PUSH_WAKE_SECRET; las claves VAPID permanecen exclusivamente en Vercel.
R8. Pruebas deterministas cubren inserción idempotente, wake-up, webhook perdido, dos workers concurrentes, recuperación tras reinicio, backoff, entrega y fallos permanentes.
R9. Typecheck, lint, tests Python y TypeScript, Prisma validate y diff-scope finalizan con código cero.

