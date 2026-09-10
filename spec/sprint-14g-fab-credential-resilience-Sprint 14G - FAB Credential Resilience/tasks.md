# Sprint 14G - FAB Credential Resilience · Tareas

- [ ] T1: Capturar y sanear fixtures de identidad válida, rotación de `key` e identidad caducada.
- [ ] T2: Definir códigos y clasificador de fallos FAB sin heurísticas basadas únicamente en texto libre.
- [ ] T3: Validar una sonda autenticada mínima contra FAB real y documentar su contrato.
- [ ] T4: Implementar coordinador de renovación con lock, recarga y persistencia atómica.
- [ ] T5: Añadir replay único solo para operaciones de lectura declaradas seguras.
- [ ] T6: Separar presupuesto de recuperación de autenticación y retries de transporte/circuit breaker.
- [ ] T7: Validar almacenamiento escribible en modo live y documentar Docker local y despliegue futuro.
- [ ] T8: Propagar códigos saneados a `ingestion_runs` y logs estructurados.
- [ ] T9: Añadir tests unitarios, concurrencia multiproceso y prueba live opt-in.
- [ ] T10: Ejecutar smoke `competition → schedule → stats → lifecycle` y probar caducidad inducida sin duplicar datos.
- [ ] T11: Actualizar runbook de recuperación manual y automática.

