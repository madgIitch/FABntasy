# sprint-22c-fab-competition-monitoring · Catálogo y monitorización de competiciones FAB — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) El scheduler ejecuta cada seis horas, con jitter y exclusión mutua, un barrido paginado de todas las competiciones publicadas que el contrato FAB permita enumerar, sin filtrar por nombre, delegación ni selección fantasy.  ↔ R1
- [x] (T2) El catálogo usa los IDs externos FAB como identidad; un cambio de nombre, categoría o delegación actualiza metadatos y genera un evento de cambio, pero nunca crea ni fusiona una competición basándose solo en texto.  ↔ R2
- [x] (T3) Un barrido incompleto, una página inválida o un fallo de FAB queda marcado PARTIAL o FAILED, conserva el último snapshot válido y no interpreta ausencias como retiradas.  ↔ R3
- [x] (T4) El descubrimiento global es ligero y no descarga automáticamente equipos, calendarios ni boxscores de todas las competiciones; la ingesta profunda permanece limitada a competiciones monitorizadas o fantasyEnabled.  ↔ R4
- [x] (T5) La consola permite buscar y filtrar el catálogo por texto, temporada, delegación y estado, y muestra primera observación, última comprobación, último cambio y checksum sin exponer credenciales ni payloads RAW.  ↔ R5
- [x] (T6) La consola muestra para cada competición monitorizada sus nombres interno y FAB, alias, IDs externos, frescura, último job, último error, equipos, jornadas, partidos, próximos partidos y contadores por scheduled/live/finished/pending/stats_final.  ↔ R6
- [x] (T7) Primera Provincial de Sevilla y Liga Nacional N1 Masculina de Andalucía pueden fijarse por ID FAB aunque todavía no estén fantasyEnabled; una discrepancia como categoryId 10468 con nombre interno COPA DELEGACIÓN 2026 aparece como advertencia explícita.  ↔ R7
- [x] (T8) Fijar, desfijar o resincronizar una competición exige INGESTION_ADMIN, validación de origen y un evento de auditoría; observar el catálogo no produce mutaciones en FAB.  ↔ R8
- [x] (T9) Los barridos son idempotentes, reanudables tras reinicio y respetan el rate limiter, backoff y circuit breaker existentes; dos schedulers no duplican un mismo barrido ni sus eventos.  ↔ R9
- [x] (T10) Los tests cubren catálogo vacío, múltiples páginas, nuevas competiciones, renombrados, IDs iguales con textos distintos, textos iguales con IDs distintos, página repetida, respuesta parcial, reintento y renderizado responsive de estados HEALTHY/STALE/PARTIAL/FAILED.  ↔ R10
- [x] Tests que cubran los criterios de aceptación
