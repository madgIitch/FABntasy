# Push outbox en Railway

Los productores web insertan `push_outbox_events` dentro de la misma transacción Prisma que modifica mercado, alineación, liga o publicación de jornada. `event_key` es único y convierte cualquier repetición en un no-op. El payload se limita a identificadores internos, intención y texto/destino ya aprobados para el dispatcher; no contiene endpoints Push, claves, correo ni nombres de usuario.

Railway ejecuta `run-production`, que añade `run-push-worker` cuando está configurado. El worker hace un barrido al arrancar y después espera un wake-up o 60 segundos; en reposo no consulta con mayor frecuencia. Reclama hasta 50 filas con `FOR UPDATE SKIP LOCKED`, de modo que un despliegue accidental con dos procesos no comparte una fila. Un claim abandonado vuelve a ser elegible tras cinco minutos.

## Variables de Railway

- `DATABASE_URL`: PostgreSQL/Supabase con TLS.
- `CANASTIO_PUSH_DISPATCH_URL`: URL HTTPS de `/api/notifications/dispatch` en Vercel.
- `CANASTIO_PUSH_JOB_SECRET`: bearer enviado exclusivamente al dispatcher.
- `CANASTIO_PUSH_WAKE_SECRET`: bearer distinto que protege `POST /internal/push/wake`.

Vercel necesita además `CANASTIO_PUSH_WAKE_URL` y el mismo wake secret para acelerar la entrega. Las claves VAPID, incluido `VAPID_PRIVATE_KEY`, permanecen exclusivamente en Vercel y están prohibidas en Railway.

## Operación

Los HTTP 408/425/429/5xx y errores de red reintentan a 1 y 5 minutos; el tercer fallo termina en `FAILED` (el tramo de 15 minutos queda definido como techo compartido, sin cuarto intento). Los demás HTTP son permanentes. La observabilidad expone solo evento, conteo, estado y códigos acotados (`HTTP_5XX`, `HTTP_429`, `NETWORK_ERROR`), nunca payload, URL, secretos o excepción libre. Para recuperar un webhook perdido no se requiere intervención: el sweep de 60 segundos procesa la fila. Tras reinicio, las filas pendientes y claims vencidos se recuperan desde PostgreSQL.

Rollback: desplegar el digest anterior no elimina la tabla. El dispatcher anterior puede coexistir mientras conserve `push-dispatch.v1`; no se debe revertir la migración en producción.
