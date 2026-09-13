# ADR-002: alojamiento productivo del ingestor

Estado: **aprobada** · 2026-09-14 · responsable: peorr

## Decisión

Railway Hobby, región EU West (`europe-west4`, Amsterdam; si no está disponible, la región europea más próxima a PostgreSQL registrada en la evidencia). Un servicio, una réplica permanente, 1 vCPU y 512 MiB, ejecuta un supervisor PID 1 con exactamente un scheduler y un worker. No hay serverless ni scale-to-zero. Reinicio `on-failure`, máximo cinco intentos; después se alerta y requiere intervención.

El artefacto es una imagen OCI por digest. El volumen privado de 1 GiB se monta en `/var/lib/canastio`; `FAB_CREDENTIALS_FILE=/var/lib/canastio/fab-credentials.json`. Backup diario saneado, cifrado por el proveedor, retención siete días y restore trimestral. El acceso de emergencia exige owner de Railway con MFA, queda auditado y se usa solo tras fallo del pipeline; nunca se descargan secretos.

Presupuesto: consumo esperado USD 5/mes, alerta a USD 7 y techo USD 12. La réplica usa dos conexiones persistentes como máximo (scheduler y worker); el release job usa una conexión directa transitoria y se reserva otra para operación, total máximo 4 frente al límite gestionado documentado de 60 (6,7%). `DATABASE_URL` usa pooler y `sslmode=require`; `DIRECT_URL` TLS se limita al release job.

## Alternativas

| Destino | Ventajas | Inconvenientes | Estimación |
|---|---|---|---:|
| Railway Hobby | Volumen, proceso continuo, red privada, despliegue OCI sencillo, región UE | Menos IaC declarativa que Kubernetes; límites sujetos al plan | USD 5/mes |
| Fly.io shared CPU | Máquinas y volúmenes explícitos, regiones UE | Operación/backup más manual; riesgo de autostop mal configurado | USD 6–10/mes |
| Vercel cron/functions | Ya usado por la web | Sin proceso/volumen continuo; no satisface worker ni heartbeat | variable |

Railway minimiza operación y satisface proceso continuo y volumen sin introducir un clúster. Cambiar proveedor, región, plan, recursos, conexiones o restart exige nueva revisión de esta ADR.

## Consecuencias

La configuración versionada está en `infrastructure/railway`; los secretos solo se cargan en el store del proveedor. Migraciones se ejecutan antes de promoción mediante `DIRECT_URL`, nunca en startup. El rollback cambia únicamente el digest y conserva PostgreSQL, cola, volumen y migraciones aditivas.
