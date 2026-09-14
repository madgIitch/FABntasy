# sprint-23-release-candidate · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/app/app/**`
- `apps/web/app/api/**`
- `apps/web/src/server/**`
- `apps/web/src/components/**`
- `services/fab_ingestor/**`
- `packages/domain/**`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `tests/**`
- `docs/operations/**`
- `docs/testing/**`
- `docs/ARCHITECTURE.md`
- `docs/CONVENTIONS.md`
- `docs/DECISIONS.md`
- `.github/workflows/**`
- `.env.example`
- `package.json`
- `apps/web/package.json`
- `pnpm-lock.yaml`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** La evidencia canónica reutiliza Game y PlayerGameStat con revisión y hash de origen, FantasyPlayerGameScore único por estadística, ruleset y source_stats_version, y la revisión publicada de RoundTeamScore con las filas de ranking vigentes por liga, jornada e input_revision. No se admite una fuente de verdad paralela; las claves y constraints existentes deben reconciliarse y documentarse, y cualquier constraint faltante solo puede añadirse mediante una migración aditiva y compatible hacia atrás.
- **external_contracts:** El manifiesto fija la 1ª Provincial Senior Masculina de Sevilla 2026/2027 y una jornada publicada mediante IDs FAB reales, sin inferir identidad por nombre. La completitud de calendario exige finalizar el barrido paginado sin PARTIAL ni FAILED y reconciliar todos los partidos esperados; la de boxscore exige una respuesta estructurada válida y stats_final. Una indisponibilidad o cambio incompatible de FAB impide certificar la RC con datos inventados.
- **edge_cases:** Se definen resultados para aplazamientos, finales sin boxscore, boxscores parciales, DNP confirmado, correcciones concurrentes con publicación, doble resync y fallos entre cálculo y publicación. Se preservan nulls, atomicidad, idempotencia, una única revisión vigente y la última publicación completa.
- **ui_states:** Inicio, Jornada, partido, Mi equipo y clasificación distinguen mediante texto los estados vacío, parcial o live, pendiente de estadísticas, calculado no publicado, publicado, corregido, degradado y error. Conservan la última revisión completa, muestran frescura o revisión cuando sea relevante, bloquean acciones inválidas y limitan las acciones administrativas a roles autorizados.

## Decisiones de la entrevista

- **adv-b059175ad7:** ### [adv-c3b1d33daf] Falta la matriz exacta de autorización para solicitar resync, aplicar/revertir correcciones, publicar resultados y aprobar excepciones de defectos.

**R:**
- **adv-c125f15ace:** ### [adv-229f568f80] No se delimita qué eventos son «deduplicables» frente a los intentos que deben generar una auditoría individual; un resync repetido podría legítimamente no crear eventos de dominio pero sí nuevos eventos de auditoría.

**R:**
- **adv-b4c4e4f5ba:** ### [adv-23ed73426a] No se define qué errores de consola están aceptados ni la taxonomía exacta de «fallos de accesibilidad bloqueantes»; los criterios previos solo concretan infracciones axe critical o serious.

**R:**
- **adv-d62258432f:** ### [adv-4d15e3a835] El ensayo de rollback no identifica inequívocamente la «versión anterior» de web e ingestor que debe usarse como baseline, por ejemplo mediante release o digest.

**R:**
- **data_model:** La evidencia canónica reutiliza el modelo vigente: Game y PlayerGameStat con su revisión/hash de origen; FantasyPlayerGameScore único por estadística, ruleset y source_stats_version; revisión publicada de RoundTeamScore y filas de ranking vigentes por liga/jornada/input_revision. No se crea una fuente de verdad paralela. Las claves únicas y constraints ya aprobadas deben reconciliarse y documentarse; si falta alguna para impedir duplicados reales, solo se admite una migración aditiva y compatible hacia atrás.
- **error_states:** Datos ausentes conservan null y estados/códigos estables existentes (PENDING, NOT_CALCULABLE, INSUFFICIENT_NORMALIZATION_SAMPLE y MISSING_REQUIRED_STAT cuando corresponda). Un fallo de recálculo o publicación no sustituye ni oculta la última revisión completa publicada; la operación falla de forma auditable y reintentable. Nunca se expone como definitivo un resultado parcial y la UI ofrece reintento solo a actores autorizados.
- **edge_cases:** Aplazado y final sin boxscore quedan pendientes y no publicables; boxscore parcial permanece provisional y no convierte null en cero; DNP confirmado puntúa cero según el ruleset y queda diferenciado de ausencia; una corrección concurrente con publicación serializa o reintenta y deja una única revisión vigente; doble resync converge idempotentemente; un fallo entre cálculo y publicación revierte la transacción y conserva la última publicación completa.
- **auth_secrets:** Lecturas privadas dependen de sesión y pertenencia; resync y correcciones exigen INGESTION_ADMIN, origen validado y auditoría. La publicación usa el actor/servicio server-side ya autorizado. Solo el responsable de release designado puede aceptar un riesgo alto, dejando aprobador, mitigación y caducidad. Se excluyen de logs, trazas, capturas e informes id_dispositivo, key, tokens, cookies, Authorization, secretos de despliegue, payload RAW no redactado, correos reales y demás PII.
- **external_contracts:** El manifiesto de ejecución debe fijar antes del smoke la 1ª Provincial Senior Masculina de Sevilla 2026/2027, sus IDs FAB reales y una jornada publicada elegida por ID, sin inferir identidad por nombre. Calendario completo exige que el barrido paginado termine sin PARTIAL/FAILED y que todos los partidos esperados estén reconciliados; boxscore completo exige respuesta estructurada válida y stats_final conforme al contrato vigente. Si FAB cambia o no está disponible, la RC no se certifica con datos inventados: se conserva evidencia del fallo, se valida la degradación con fixtures reproducibles y se repite el smoke real cuando el proveedor se recupere.
- **ui_states:** Inicio, Jornada, partido, Mi equipo y clasificación deben distinguir con texto y sin falsos ceros: vacío/sin datos, parcial o live, pendiente de estadísticas, calculado no publicado, publicado, corregido, degradado y error. Deben mantener visible la última revisión completa cuando exista, identificar frescura/revisión cuando sea relevante, bloquear acciones inválidas y ofrecer recarga o reintento contextual; las acciones administrativas solo aparecen para el rol autorizado. Se conservan accesibilidad, locale es-ES, Europe/Madrid y viewports aprobados.
- **rollback_compat:** Web e ingestor se despliegan por artefacto/digest y el ensayo vuelve al digest anterior. Toda migración será aditiva y compatible con la versión previa; no se borran datos deportivos, revisiones ni auditoría. Los jobs RUNNING se diagnostican mediante heartbeat, lock y eventos según el runbook, se detienen ordenadamente y solo se reencolan de forma auditada cuando no existe lock. Tras rollback se comprueba lectura de la última revisión publicada y reanudación idempotente.
- **tests:** La matriz crítica cubre autenticación, crear/unirse a liga, mercado/roster, alineación y cutoff, jornada parcial, publicación/ranking, corrección/republicación y degradación. Se ejecuta en Chromium, Firefox y WebKit soportados por la versión fijada de Playwright, con 375x812 y 1440x900; los escenarios deterministas usan la suite 14F y el smoke de ingesta usa la jornada real fijada. El informe fechado incluye commit y digests, manifiesto saneado, runs/revisiones, reconciliaciones, gates, matriz E2E, evidencias y registro de defectos/aceptaciones firmado por el responsable de release.
