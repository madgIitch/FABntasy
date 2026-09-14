# Operación de producción 1.0

Este documento es el índice autoritativo para `1.0.0`. El origen canónico es `https://fabntasy.es`; web/DNS se operan en Vercel (`fra1`), PostgreSQL/Auth en Supabase (`eu-west-1`) e ingestor en Railway (`europe-west4`). Responsables por rol: `product-owner` (go/no-go), `web-on-call`, `data-on-call` y `security-owner`. Los valores efectivos de commit y digests se adjuntan al registro privado del release; nunca se despliega por tag mutable.

## Estados y escalado

`HEALTHY`: heartbeat <10 min y sin gates fallidos. `DEGRADED`: dependencia recuperable, error rate >2%/5 min o datos obsoletos; conservar última publicación y avisar al on-call en 15 min. `STALE`: heartbeat >10 min o job sin heartbeat >15 min; investigar lock antes de intervenir. `CRITICAL`: frontend/DB indisponible, pérdida potencial, restore o backup fallido; avisar inmediatamente a `product-owner` y `data-on-call`, bloquear promoción. Cierre: causa eliminada, dos ciclos HEALTHY, backlog drenado y evidencia saneada enlazada.

## Despliegue y rollback

1. Ejecutar `node infrastructure/scripts/validate-production.mjs` y todos los gates del workflow `production-release`.
2. Registrar release, commit SHA, digest `sha256:` web/ingestor y ambos digests anteriores. Ejecutar migraciones aditivas en el environment `production-migrations`; un fallo detiene la promoción.
3. Promover exactamente los artefactos construidos. Ejecutar el smoke HTTPS/PWA y observar heartbeat, errores y backlog 15 minutos.
4. Para rollback, detener la promoción, restaurar ambos digests anteriores sin ejecutar down migrations y sin cambiar DB o volumen. Si hay job `RUNNING`, comprobar heartbeat y advisory lock; detener ordenadamente y reencolar con actor/motivo solo si no existe lock. Confirmar auditoría, última revisión publicada, cola, credencial persistente y conteos económicos antes de cerrar.

## Backup y restore

El workflow `encrypted-database-backup` ejecuta cada 24 h `pg_dump` custom, cifra con age antes de subirlo, retiene 30 días y alerta a operaciones si falla. `data-on-call` revisa semanalmente y rota trimestralmente la clave pública; la identidad privada de descifrado vive solo en el gestor server-side.

Restore mensual: crear un proyecto PostgreSQL efímero cuyo host/nombre contenga `restore`, `recovery`, `isolated` o `staging`; nunca reutilizar las URLs de producción. Descargar y descifrar en runner efímero, ejecutar `pg_restore --exit-on-error --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" backup.dump`, después `RESTORE_DATABASE_URL=... node infrastructure/scripts/verify-restore.mjs`. Registrar timestamps de backup/inicio/fin, RPO (objetivo ≤24 h), RTO (objetivo ≤60 min), esquema, recuentos e invariantes. Destruir el entorno aislado tras la revisión; un resultado incompleto es CRITICAL.

## Incidentes

- FAB: verificar circuito/backoff y credencial sin imprimirla; no hacer scraping. Conservar publicaciones; rotar identidad si `AUTH_EXPIRED`; cerrar tras un sync acotado correcto.
- PostgreSQL: bloquear writes/promoción, revisar pool y proveedor; no reiniciar agresivamente. Si se declara desastre, seguir restore aislado y promover solo con autorización de `data-on-call`.
- Ingestor: comprobar heartbeat, procesos, job y lock. Reiniciar una réplica; deben quedar un scheduler y un worker. Nunca editar estados a mano ni reencolar con lock activo.
- Frontend: verificar Vercel, DNS/TLS y smoke; volver al digest anterior si la app no recupera en 10 min. Las APIs no deben revelar detalles internos.
- Lifecycle: mantener la última revisión publicada, conservar jobs y backoff acotado; validar el secreto compartido desde el gestor sin copiarlo a logs.

## Secretos y rotación

`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, credenciales FAB, `CANASTIO_INTERNAL_JOB_SECRET`, VAPID privada, tokens de proveedor y clave age solo existen en los gestores de Vercel/Railway/GitHub/Supabase, con acceso por environment y mínimo privilegio. Nunca usan prefijo `NEXT_PUBLIC_`, argumentos de proceso, imágenes, repositorio, bundles, logs o evidencias. Rotación trimestral y también ante exposición: crear nueva versión, probar consumidor, solapar solo cuando el proveedor lo permita, revocar anterior, ejecutar escaneo y registrar actor/fecha sin valor. FAB se sustituye atómicamente en el volumen. El secreto lifecycle se rota coordinadamente web primero e ingestor después dentro de ventana controlada.

Antes de cerrar un release o incidente se escanean repo, metadata/capas de imagen, bundle `.next`, logs y carpeta de evidencia con canarios y patrones: URLs PostgreSQL con credencial, service-role/JWT, `Authorization`, cookies, `FAB_KEY`, `FAB_DEVICE_ID`, secretos internos y claves privadas. Todo hallazgo bloquea promoción y exige rotación.

## Segunda competición

Ejecutar discovery y seleccionar la nueva categoría por ID FAB opaco; habilitar `fantasy_enabled`/`fantasy_role` mediante datos, nunca migración específica. Validar que existe como máximo una `primary`, que grupos, registros, partidos, jobs, rulesets, scores, precios, equipos y ligas llevan su `competition_season_id`, y ejecutar dos syncs idénticos. Cierre: cero cruces en `verify-restore`, cero duplicados y la primaria conserva ID y rol.

