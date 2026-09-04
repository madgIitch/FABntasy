# Entrevista · sprint-1-fab-client · Sprint 1 - FAB Client

- name: `Sprint 1 - FAB Client`
- estado: **dimensiones cubiertas** → aprueba con `spec.mjs approve sprint-1-fab-client`

## Cobertura de dimensiones

- ✅ data_model — El cliente devuelve modelos tipados de dispositivo, partidos, categorías y equipos sin acoplarse a Prisma.
- ✅ error_states — HTTP 4xx no se reintenta indefinidamente; timeout, 429 y 5xx tienen errores distinguibles y backoff acotado.
- ✅ edge_cases — La paginación usa `skip`, termina con la respuesta corta o el total y evita páginas concurrentes.
- ✅ auth_secrets — `id_dispositivo` y `key` solo viven en configuración server-side y nunca aparecen en logs o excepciones.
- ✅ external_contracts — Las búsquedas usan exclusivamente POST form-urlencoded contra `/v2/busqueda.ashx`; el registro usa `/dispositivo.ashx`.
- ✅ ui_states — No aplica: el cliente no expone UI ni se consume directamente desde el navegador.
- ✅ rollback_compat — `FabClient` es una frontera reemplazable y el modo mock permite operar sin red.
- ✅ tests — Fixtures y mocks cubren registro, rotación, paginación, timeout y errores sin red real.

## Scope propuesto

- `services/fab_ingestor/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Acceptance propuesto

1. register_device reproduce el POST a `/dispositivo.ashx` y valida `resultado=correcto`, `id_dispositivo` y `key`.
2. search_match, search_category y search_team usan exclusivamente `/v2/busqueda.ashx` con parámetros form-urlencoded.
3. La paginación usa `skip` y nunca solicita páginas concurrentes del mismo recurso.
4. Una key nueva devuelta por FAB sustituye de forma atómica a la anterior.
5. Logs y excepciones no contienen `id_dispositivo`, `key` ni bodies completos con credenciales.
6. 429 y 5xx aplican backoff acotado; 4xx no se reintentan en bucle.
7. Tests unitarios no requieren acceso real a FAB y cubren registro, rotación de key, paginación, timeout y error.
