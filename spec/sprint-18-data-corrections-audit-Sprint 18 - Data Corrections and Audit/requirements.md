# sprint-18-data-corrections-audit · undefined — Requisitos

- name: `Sprint 18 - Data Corrections and Audit` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-11T14:01:05.191Z

## Contexto



## Requisitos funcionales

R1. Las revisiones son inmutables y conservan source original, snapshot anterior/posterior, tipo, actor, motivo, estado y timestamps; ninguna corrección destruye el valor recibido de FAB.
R2. Solo un `INGESTION_ADMIN` activo puede consultar, proponer, aplicar o revertir revisiones; identidad y permisos se resuelven server-side y usuarios no autorizados reciben 404.
R3. La v1 solo permite campos explícitamente autorizados de Game y PlayerGameStat; rechaza IDs, external IDs, credenciales, reglas, usuarios, ligas, economía y campos derivados.
R4. `SOURCE_CORRECTION` representa un cambio confirmado de FAB y `MANUAL_OVERRIDE` una decisión humana; el override exige un motivo no vacío y ambos quedan diferenciados en UI y auditoría.
R5. Antes de aplicar, el servidor devuelve un diff tipado y un resumen de impacto sin mutar datos; la confirmación incluye el identificador de propuesta y la versión/fingerprint esperada.
R6. Aplicar una revisión bloquea el recurso, verifica concurrencia y persiste corrección, auditoría e invalidación de derivados dentro de una transacción o workflow recuperable sin estados publicados a medias.
R7. Dos confirmaciones equivalentes son idempotentes; una confirmación obsoleta falla con `REVISION_CONFLICT` y no pisa un cambio posterior.
R8. El recálculo afecta únicamente scores de jugador, resultados de equipo/jornada, rankings y precios dependientes, en orden determinista y con versiones trazables.
R9. Mientras se recalcula, la última revisión publicada sigue siendo coherente; el nuevo resultado solo se publica completo y un fallo deja un estado reintentable y diagnosticable.
R10. Revertir crea una revisión compensatoria contra el estado vigente, exige motivo y vista previa y no elimina ni altera revisiones anteriores.
R11. Cada propuesta, vista previa, aplicación, fallo, reintento y reversión registra actor, acción, recurso, resultado y timestamp, sin RAW completo ni secretos.
R12. La API devuelve códigos estables y mensajes seguros para validación, autorización, conflicto, dato incompatible, recomputación y base de datos; nunca expone excepciones internas.
R13. Los usuarios pueden ver que una jornada fue recalculada, cuándo se publicó la revisión y un motivo público saneado, sin conocer el administrador ni notas internas.
R14. La UI administrativa incluye loading, vacío, diff, impacto, confirmación, progreso, éxito, conflicto y error; no permite aplicar sin confirmación y funciona sin overflow desde 320 px.
R15. Reprocesar posteriormente el mismo payload FAB no borra un override vigente de forma silenciosa; detecta el conflicto y exige una nueva revisión explícita.
R16. Tests cubren permisos, allowlist, inmutabilidad, motivo obligatorio, preview sin escritura, concurrencia, idempotencia, rollback compensatorio, alcance del recálculo, publicación atómica, auditoría, errores seguros y estados responsive.

