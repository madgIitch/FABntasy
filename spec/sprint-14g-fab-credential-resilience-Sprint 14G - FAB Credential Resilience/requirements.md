# Sprint 14G - FAB Credential Resilience · Requisitos

- status: `spec_ready`
- spec_approved: `false`
- incidente de origen: `docs/operations/INCIDENT_2026-09-10_FAB_DEVICE_EXPIRY.md`

## Requisitos funcionales

R1. El ingestor distingue rotación ordinaria de `key`, caducidad probable del dispositivo, error de contrato, error funcional y fallo transitorio sin registrar secretos ni cuerpos completos.

R2. Una `key` nueva recibida en una respuesta válida se persiste atómicamente antes de la siguiente petición y sobrevive al reinicio del contenedor.

R3. Ante una señal compatible con identidad caducada, el cliente ejecuta una única sonda autenticada segura. Solo si la sonda confirma el rechazo registra un dispositivo nuevo.

R4. Tras renovar la identidad, el cliente repite como máximo una vez la petición original cuando la operación sea de lectura y esté declarada como reproducible.

R5. La recuperación nunca entra en bucle, nunca renueva ante 429/5xx/timeouts y no convierte un cambio de contrato en éxito silencioso.

R6. Dos workers concurrentes no registran identidades distintas ni corrompen el almacén: la renovación usa exclusión mutua y escritura atómica compartida.

R7. Si la renovación falla, el job conserva datos confirmados, termina con un código específico y queda reintentable en el siguiente ciclo.

R8. El contenedor valida al arrancar que el almacén de credenciales es escribible cuando opera en modo `live`; una configuración de solo lectura falla antes de llamar a FAB con un mensaje saneado y accionable.

R9. Métricas y `ingestion_runs` distinguen `FAB_AUTH_EXPIRED`, `FAB_AUTH_REFRESH_FAILED`, `FAB_CONTRACT_ERROR` y `FAB_RESPONSE` sin incluir identificadores ni claves.

R10. Tests sin red cubren rotación, caducidad, sonda, renovación, replay único, concurrencia, almacenamiento no escribible, rechazo persistente y redacción. Una prueba live opt-in valida el flujo contra FAB sin ejecutarse en CI ordinaria.

## Fuera de alcance

- Despliegue cloud, scheduler gestionado y Secret Manager.
- Cambiar firmas FAB sin nueva evidencia real.
- Reproducir mutaciones no idempotentes.
- Mostrar credenciales o payloads FAB desde la PWA.

