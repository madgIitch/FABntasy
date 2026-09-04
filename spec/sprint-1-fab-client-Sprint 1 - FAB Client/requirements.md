# sprint-1-fab-client · undefined — Requisitos

- name: `Sprint 1 - FAB Client` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-04T21:55:37.672Z

## Contexto



## Requisitos funcionales

R1. AC1: register_device reproduce el POST a /dispositivo.ashx y valida resultado=correcto, id_dispositivo y key.
R2. AC2: search_match, search_category y search_team usan exclusivamente /v2/busqueda.ashx con parámetros form-urlencoded.
R3. AC3: La paginación usa skip y nunca solicita páginas concurrentes del mismo recurso.
R4. AC4: Una key nueva devuelta por FAB sustituye de forma atómica a la anterior.
R5. AC5: Logs y excepciones no contienen id_dispositivo, key ni bodies completos con credenciales.
R6. AC6: 429 y 5xx aplican backoff acotado; 4xx no se reintentan en bucle.
R7. AC7: Tests unitarios no requieren acceso real a FAB y cubren registro, rotación de key, paginación, timeout y error.

## Restricciones

- **error_states:** Timeout, 429 y 5xx producen errores tipados y backoff acotado; otros 4xx no se reintentan en bucle.
- **auth_secrets:** id_dispositivo y key nunca se registran, incluyen en excepciones ni se exponen mediante variables públicas.
- **rollback_compat:** El cliente queda aislado detrás de FabClient y no modifica el modelo deportivo ni introduce llamadas FAB desde la PWA.

