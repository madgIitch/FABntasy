# sprint-1-fab-client · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) register_device reproduce el POST a `/dispositivo.ashx` y valida `resultado=correcto`, `id_dispositivo` y `key`.  ↔ R1
- [ ] (T2) search_match, search_category y search_team usan exclusivamente `/v2/busqueda.ashx` con parámetros form-urlencoded.  ↔ R2
- [ ] (T3) La paginación usa `skip` y nunca solicita páginas concurrentes del mismo recurso.  ↔ R3
- [ ] (T4) Una key nueva devuelta por FAB sustituye de forma atómica a la anterior.  ↔ R4
- [ ] (T5) Logs y excepciones no contienen `id_dispositivo`, `key` ni bodies completos con credenciales.  ↔ R5
- [ ] (T6) 429 y 5xx aplican backoff acotado; 4xx no se reintentan en bucle.  ↔ R6
- [ ] (T7) Tests unitarios no requieren acceso real a FAB y cubren registro, rotación de key, paginación, timeout y error.  ↔ R7
- [ ] Tests que cubran los criterios de aceptación
