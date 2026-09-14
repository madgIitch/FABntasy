# sprint-22c-fab-competition-monitoring · Catálogo y monitorización de competiciones FAB — Requisitos

- name: `Sprint 22C - FAB Competition Monitoring` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-14T12:38:19.113Z

## Contexto

Descubrir periódicamente todas las competiciones publicadas por FAB, conservar su identidad y cambios de metadatos, y mostrar en la consola administrativa el estado detallado de las competiciones elegidas para Canastio.

## Requisitos funcionales

R1. El scheduler ejecuta cada seis horas, con jitter y exclusión mutua, un barrido paginado de todas las competiciones publicadas que el contrato FAB permita enumerar, sin filtrar por nombre, delegación ni selección fantasy.
R2. El catálogo usa los IDs externos FAB como identidad; un cambio de nombre, categoría o delegación actualiza metadatos y genera un evento de cambio, pero nunca crea ni fusiona una competición basándose solo en texto.
R3. Un barrido incompleto, una página inválida o un fallo de FAB queda marcado PARTIAL o FAILED, conserva el último snapshot válido y no interpreta ausencias como retiradas.
R4. El descubrimiento global es ligero y no descarga automáticamente equipos, calendarios ni boxscores de todas las competiciones; la ingesta profunda permanece limitada a competiciones monitorizadas o fantasyEnabled.
R5. La consola permite buscar y filtrar el catálogo por texto, temporada, delegación y estado, y muestra primera observación, última comprobación, último cambio y checksum sin exponer credenciales ni payloads RAW.
R6. La consola muestra para cada competición monitorizada sus nombres interno y FAB, alias, IDs externos, frescura, último job, último error, equipos, jornadas, partidos, próximos partidos y contadores por scheduled/live/finished/pending/stats_final.
R7. Primera Provincial de Sevilla y Liga Nacional N1 Masculina de Andalucía pueden fijarse por ID FAB aunque todavía no estén fantasyEnabled; una discrepancia como categoryId 10468 con nombre interno COPA DELEGACIÓN 2026 aparece como advertencia explícita.
R8. Fijar, desfijar o resincronizar una competición exige INGESTION_ADMIN, validación de origen y un evento de auditoría; observar el catálogo no produce mutaciones en FAB.
R9. Los barridos son idempotentes, reanudables tras reinicio y respetan el rate limiter, backoff y circuit breaker existentes; dos schedulers no duplican un mismo barrido ni sus eventos.
R10. Los tests cubren catálogo vacío, múltiples páginas, nuevas competiciones, renombrados, IDs iguales con textos distintos, textos iguales con IDs distintos, página repetida, respuesta parcial, reintento y renderizado responsive de estados HEALTHY/STALE/PARTIAL/FAILED.

## Restricciones

- **error_states:** EMPTY, PARTIAL, FAILED y STALE conservan el último snapshot completo y nunca retiran datos por ausencia parcial.
- **auth_secrets:** INGESTION_ADMIN, origen validado, auditoría y prohibición de secretos o RAW en resúmenes.
- **rollback_compat:** Tablas aditivas y feature desactivable sin eliminar catálogo ni afectar la ingesta actual.

