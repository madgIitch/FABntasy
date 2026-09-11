# sprint-17-ingestion-admin · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) `/app/admin/ingestion` y todos los endpoints admin obtienen la identidad de Supabase en servidor y exigen un grant global `INGESTION_ADMIN` activo; usuarios anónimos o normales reciben 404 y no ven enlaces admin.  ↔ R1
- [ ] (T2) Los grants registran perfil, rol, concedente, fechas de alta y revocación y solo se provisionan mediante SQL/CLI; no existe endpoint público de autoconcesión.  ↔ R2
- [ ] (T3) El panel muestra estado HEALTHY, DEGRADED o STALE derivado de runs y heartbeat persistidos, sin llamar a FAB durante el render, e indica último ciclo y último éxito por competición.  ↔ R3
- [ ] (T4) El panel lista jobs y `ingestion_runs` recientes con filtros por estado, tipo y competición, timestamps Europe/Madrid, contadores saneados y códigos de error estables.  ↔ R4
- [ ] (T5) Los fallos se clasifican de forma visible como autenticación/FAB, red/timeout, datos inválidos, normalización o base de datos, sin exponer mensajes internos ni secretos.  ↔ R5
- [ ] (T6) Un admin puede encolar resync de competición, jornada o partido mediante una petición same-origin validada; la respuesta 202 incluye un ID consultable y nunca espera la ejecución Python.  ↔ R6
- [ ] (T7) Cada job persiste tipo, target normalizado, solicitante, estado QUEUED/RUNNING/SUCCEEDED/FAILED/CANCELLED, timestamps, contadores y errorCode seguro.  ↔ R7
- [ ] (T8) Una clave idempotente y un índice único parcial impiden dos jobs QUEUED/RUNNING equivalentes; una solicitud duplicada devuelve el job existente.  ↔ R8
- [ ] (T9) El worker Python reclama jobs con bloqueo PostgreSQL `FOR UPDATE SKIP LOCKED`, reutiliza los comandos y advisory locks existentes y actualiza resultado incluso ante excepción controlada.  ↔ R9
- [ ] (T10) Un job atascado supera un umbral explícito y aparece STALE; no se relanza automáticamente ni se ejecutan dos instancias sobre el mismo recurso.  ↔ R10
- [ ] (T11) El listado RAW expone solo endpoint, entityType, externalId, retrievedAt, httpStatus y checksum, paginado y limitado por defecto a los últimos 30 días.  ↔ R11
- [ ] (T12) El detalle RAW requiere gesto explícito, limita la respuesta a 256 KiB y redacta recursivamente claves, id_dispositivo, authorization, cookie, token, password y secret sin distinción de mayúsculas.  ↔ R12
- [ ] (T13) El panel no ofrece descarga masiva, no devuelve payloads RAW a usuarios no admin y nunca contiene FAB_DEVICE_ID, FAB_KEY ni VAPID_PRIVATE_KEY en HTML, JSON, auditoría o logs.  ↔ R13
- [ ] (T14) Cada encolado, reintento, consulta de RAW y cambio de job crea un evento de auditoría con actor, acción, recurso, resultado y timestamp, sin guardar payloads ni credenciales.  ↔ R14
- [ ] (T15) La UI incluye estados loading, vacío, error, confirmación para jobs amplios y refresco acotado mientras existan jobs activos; funciona sin overflow desde 320 px.  ↔ R15
- [ ] (T16) Si el ingestor está desconectado, el panel sigue cargando desde PostgreSQL y explica que los jobs permanecerán en cola.  ↔ R16
- [ ] (T17) Tests cubren autorización, idempotencia concurrente, claim exclusivo, clasificación de errores, stale, redacción profunda, límite RAW, auditoría, estados UI y responsive sin llamadas reales a FAB.  ↔ R17
- [ ] Tests que cubran los criterios de aceptación
