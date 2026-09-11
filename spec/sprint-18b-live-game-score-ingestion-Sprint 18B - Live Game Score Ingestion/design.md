# sprint-18b-live-game-score-ingestion · undefined — Diseño

## Scope (archivos que puede tocar)

- `services/fab_ingestor/**`
- `apps/web/src/server/**`
- `apps/web/src/app/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Decisiones de la entrevista

- **product_boundary:** El sprint incorpora tanteo, parciales y estadísticas individuales provisionales en vivo a la ingesta deportiva existente. No convierte el producto en un play-by-play, no consulta FAB desde la PWA y no publica puntuaciones fantasy definitivas antes del cierre del partido.
- **source_contract:** La evidencia real confirma que `buscarPartido` puede devolver `Estado=Comenzado` y resultado `-/-` mientras `/v2/envivo/estadisticas.ashx` devuelve en `partido` el tanteo, periodos, estado y fecha de actualización. El marcador no depende de que existan filas individuales de jugadores.
- **eligibility_and_cadence:** Se consultan partidos marcados como comenzados y partidos cuyo horario caiga en la ventana activa, para tolerar retrasos del endpoint general. La cadencia activa es configurable entre 30 y 900 segundos, con 30 segundos por defecto, y reutiliza locks, rate limit, backoff y circuit breaker existentes; fuera de la ventana vuelve a la cadencia de reposo.
- **reconciliation:** La reconciliación es por campo. Gana el dato FAB válido más reciente; sin timestamp fiable se conserva el valor más completo. Un guion, ausencia o payload atrasado no borra marcadores o parciales válidos y un estado finalizado no retrocede por una respuesta general retrasada.
- **period_semantics:** Los periodos mantienen orden, número y tanteo publicado. El contrato distingue ausencia del periodo frente a un periodo presente a cero, y admite prórrogas sin asumir exactamente cuatro entradas.
- **fantasy_boundary:** El tanteo live actualiza Game y, cuando FAB publica jugadores, sus estadísticas alimentan snapshots y puntos fantasy provisionales. No se exige completitud ni igualdad con el tanteo hasta el cierre; filas o campos ausentes permanecen intactos o `null` y nunca se convierten en cero. Nada de ello marca estadísticas finales ni dispara publicación definitiva.
- **audit_and_idempotency:** Se conserva RAW saneado con checksum y metadatos de fuente/frescura. Repetir el mismo snapshot no duplica registros ni genera revisiones o derivados espurios; los overrides administrativos vigentes mantienen las protecciones de Sprint 18.
- **public_contract:** La API propia devuelve estado, tanteo nullable, parciales, última actualización y frescura desde PostgreSQL. Si FAB falla, se conserva y sirve el último snapshot válido con indicación de posible desfase.
