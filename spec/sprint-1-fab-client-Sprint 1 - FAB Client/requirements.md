# sprint-1-fab-client · undefined — Requisitos

- name: `Sprint 1 - FAB Client` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-04T18:06:15.878Z

## Contexto



## Requisitos funcionales

R1. register_device reproduce el POST a `/dispositivo.ashx` y valida `resultado=correcto`, `id_dispositivo` y `key`.
R2. search_match, search_category y search_team usan exclusivamente `/v2/busqueda.ashx` con parámetros form-urlencoded.
R3. La paginación usa `skip` y nunca solicita páginas concurrentes del mismo recurso.
R4. Una key nueva devuelta por FAB sustituye de forma atómica a la anterior.
R5. Logs y excepciones no contienen `id_dispositivo`, `key` ni bodies completos con credenciales.
R6. 429 y 5xx aplican backoff acotado; 4xx no se reintentan en bucle.
R7. Tests unitarios no requieren acceso real a FAB y cubren registro, rotación de key, paginación, timeout y error.

## Restricciones

- **error_states:** HTTP 4xx no se reintenta indefinidamente; timeout, 429 y 5xx tienen errores distinguibles y backoff acotado.
- **auth_secrets:** `id_dispositivo` y `key` solo viven en configuración server-side y nunca aparecen en logs o excepciones.
- **rollback_compat:** `FabClient` es una frontera reemplazable y el modo mock permite operar sin red.

