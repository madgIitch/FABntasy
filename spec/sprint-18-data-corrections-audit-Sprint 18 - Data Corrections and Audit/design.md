# sprint-18-data-corrections-audit · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `services/fab_ingestor/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Decisiones de la entrevista

- **product_boundary:** El sprint permite corregir datos deportivos ya importados y recomputar únicamente sus derivados fantasy. No sustituye el panel general de ingesta, no crea un editor libre de base de datos y no modifica reglas de scoring o precios.
- **revision_model:** Toda corrección es una revisión inmutable. Conserva el valor FAB original, snapshot anterior y posterior, origen `SOURCE_CORRECTION` o `MANUAL_OVERRIDE`, actor, motivo, estado y timestamps. Corregir o revertir crea otra revisión; nunca se reescribe ni elimina el historial.
- **workflow:** Un administrador `INGESTION_ADMIN` prepara una propuesta, obtiene una vista previa del diff y del impacto, y la confirma expresamente. La aplicación es transaccional e idempotente. La primera versión no añade un segundo aprobador, pero separa propuesta y confirmación y exige motivo en overrides manuales.
- **allowed_targets:** La primera versión admite campos normalizados de `Game` y `PlayerGameStat` incluidos en una allowlist server-side. Identidad, claves externas, credenciales, usuarios, ligas, reglas y transacciones económicas quedan fuera. Los campos derivados nunca se editan directamente: se recomputan.
- **recomputation:** Tras aplicar una revisión se invalidan y recalculan, en orden, fantasy player scores, resultados de equipo/jornada, rankings y precios que dependan del partido o estadística corregidos. El alcance afectado se calcula antes de aplicar, queda auditado y no incluye otras jornadas sin dependencia.
- **concurrency_and_rollback:** PostgreSQL bloquea el recurso y usa versión esperada o fingerprint del snapshot para detectar cambios concurrentes. Una revisión repetida devuelve el resultado existente. Revertir significa crear una revisión compensatoria contra el estado vigente, con nueva vista previa y auditoría.
- **security_and_audit:** Página y endpoints son server-side y requieren el grant global `INGESTION_ADMIN`; el actor nunca viene del body. La auditoría no guarda secretos, cookies, headers ni RAW completo. Los usuarios normales solo reciben los resultados fantasy publicados y un aviso de recalculado.
- **ui_states:** El panel ofrece búsqueda del recurso, selección de campo permitido, valor actual/original, propuesta, motivo, diff, impacto, confirmación, progreso, éxito, conflicto y error seguro. Las acciones destructivas se distinguen claramente y la UI funciona desde 320 px.

