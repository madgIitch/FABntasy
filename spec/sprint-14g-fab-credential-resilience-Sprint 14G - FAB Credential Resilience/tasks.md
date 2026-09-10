# sprint-14g-fab-credential-resilience · Sprint 14G - Resiliencia de credenciales FAB — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) Una key rotada se persiste atómicamente y sobrevive al reinicio del contenedor.  ↔ R1
- [ ] (T2) Una identidad caducada confirmada provoca como máximo un registro y un replay seguro.  ↔ R2
- [ ] (T3) Errores de contrato, 429, 5xx y timeouts no provocan registro de dispositivo.  ↔ R3
- [ ] (T4) Dos workers concurrentes convergen en una única identidad válida sin corrupción.  ↔ R4
- [ ] (T5) Un almacén no escribible falla al arrancar en modo live con diagnóstico saneado.  ↔ R5
- [ ] (T6) ingestion_runs distingue expiración, fallo de renovación, contrato y respuesta sin secretos.  ↔ R6
- [ ] (T7) El ciclo completo vuelve a ser idempotente después de una renovación.  ↔ R7
- [ ] (T8) Tests sin red y un smoke live opt-in demuestran rotación, recuperación, replay único y redacción.  ↔ R8
- [ ] Tests que cubran los criterios de aceptación
