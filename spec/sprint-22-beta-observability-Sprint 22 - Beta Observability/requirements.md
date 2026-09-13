# sprint-22-beta-observability · undefined — Requisitos

- name: `Sprint 22 - Beta Observability` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-13T22:46:42.051Z

## Contexto



## Requisitos funcionales

R1. Existe una capa de observabilidad compartida con esquema versionado y adaptadores server, client e ingestor; los tests usan un sink local determinista y ninguna petición de producto falla cuando el sink está desactivado o indisponible.
R2. Un fallo sintético de FAB, PostgreSQL, aplicación web o ingestor genera una señal con `timestamp`, `release`, `environment`, `component`, `operation`, `result` y `errorCategory`, y cada origen queda clasificado de forma inequívoca.
R3. La redacción se ejecuta antes de almacenar o transportar eventos y pruebas con valores canario demuestran que tokens, cookies, contraseñas, credenciales FAB, DSN, cuerpos, payloads RAW, correos, nombres privados e IDs directos de usuario no aparecen en eventos ni dashboards.
R4. Los errores client-side se agrupan por firma estable y release sin capturar contenido de formularios, URL queries, estado privado de ligas, stack con datos dinámicos ni identificadores directos de usuario.
R5. Métricas de uso del producto registran únicamente eventos agregables con nombres y dimensiones allowlist de cardinalidad acotada; no permiten reconstruir la actividad o contenido de un usuario individual.
R6. La ruta administrativa de estado requiere autorización server-side y muestra salud global, frescura, heartbeat, último éxito, jobs fallidos, jobs bloqueados, backlog, tasa de errores y latencias por componente sin stack traces ni datos sensibles.
R7. La página interna cubre estados de carga, vacío, parcial, obsoleto, error y offline, conserva accesibilidad y responsive de 320 a 1440 px y muestra el timestamp de la última señal válida.
R8. Heartbeat mayor de 10 minutos, job sin progreso durante 15 minutos, backlog superior a 20 durante 10 minutos, error rate superior al 2% durante 5 minutos o p95 sobre el presupuesto del Sprint 20 durante 10 minutos producen salud degradada o crítica y una señal operativa deduplicada.
R9. Las señales equivalentes se deduplican por componente, operación, categoría y release, están limitadas en frecuencia/tamaño/cardinalidad y conservan contadores e intervalo sin ocultar recuperaciones o cambios de severidad.
R10. El canal de feedback autenticado guarda categoría, texto acotado, estado y timestamps en un flujo separado de logs técnicos; adjuntar contexto técnico saneado requiere consentimiento explícito y nunca concede al usuario acceso a telemetría interna.
R11. El formulario de feedback presenta envío, éxito, error recuperable, offline y prevención de doble envío; validación, rate limit e idempotencia impiden abuso y duplicados previsibles.
R12. Error tracking, métricas de uso y feedback tienen flags server-side independientes; desactivarlos convierte sus escrituras en no-op o solo lectura sin modificar datos de producto ni contratos de negocio.
R13. El runbook documenta diagnóstico, responsables, severidades, triage, comunicación, recuperación y cierre, además de pausar y reanudar ingesta, scoring y mercado sin borrar datos ni exponer publicaciones parciales.
R14. Las migraciones son aditivas, la retención de telemetría y feedback está documentada y la retirada de un proveedor o rollback de aplicación no exige migraciones destructivas.
R15. Tests unitarios, de integración y smoke cubren clasificación, redacción, deduplicación, umbrales, permisos, feedback separado, sink caído, flags y estados UI sin llamadas reales a FAB ni proveedores externos.
R16. Typecheck, lint, tests web, pytest, ruff, Prisma validate y diff-scope terminan con código cero.

## Restricciones

- **error_states:** salud, categorías, degradación parcial y fallo del sink definidos.
- **auth_secrets:** allowlist, redacción previa, permisos y datos prohibidos definidos.
- **rollback_compat:** flags independientes, no-op, cambios aditivos y runbook definidos.

