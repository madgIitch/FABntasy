# sprint-14g-fab-credential-resilience · Sprint 14G - Resiliencia de credenciales FAB — Requisitos

- name: `Sprint 14G - FAB Credential Resilience` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-10T15:36:50.178Z

## Contexto

Originado por el incidente documentado en docs/operations/INCIDENT_2026-09-10_FAB_DEVICE_EXPIRY.md. Spec detallada en spec/sprint-14g-fab-credential-resilience-Sprint 14G - FAB Credential Resilience/.

## Requisitos funcionales

R1. Una key rotada se persiste atómicamente y sobrevive al reinicio del contenedor.
R2. Una identidad caducada confirmada provoca como máximo un registro y un replay seguro.
R3. Errores de contrato, 429, 5xx y timeouts no provocan registro de dispositivo.
R4. Dos workers concurrentes convergen en una única identidad válida sin corrupción.
R5. Un almacén no escribible falla al arrancar en modo live con diagnóstico saneado.
R6. ingestion_runs distingue expiración, fallo de renovación, contrato y respuesta sin secretos.
R7. El ciclo completo vuelve a ser idempotente después de una renovación.
R8. Tests sin red y un smoke live opt-in demuestran rotación, recuperación, replay único y redacción.

