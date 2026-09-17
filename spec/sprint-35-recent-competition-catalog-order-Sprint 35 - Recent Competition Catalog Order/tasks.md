# sprint-35-recent-competition-catalog-order · Competiciones recientes primero en el catálogo FAB — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) La consulta del catálogo general ordena primero por lastChangedAt descendente y no usa lastCheckedAt ni monitored como claves de prioridad.  ↔ R1
- [x] (T2) Una fila recién insertada, cuyo lastChangedAt se inicializa en el momento del descubrimiento, aparece antes que cualquier fila con lastChangedAt anterior.  ↔ R2
- [x] (T3) Cuando cambia el checksum de una competición, la actualización de lastChangedAt hace que aparezca antes que filas con actividad anterior.  ↔ R3
- [x] (T4) Una observación con checksum idéntico actualiza lastCheckedAt pero conserva lastChangedAt y, por tanto, no cambia la prioridad cronológica.  ↔ R4
- [x] (T5) Cambiar monitored entre true y false no modifica la posición relativa de dos filas con distintos valores de lastChangedAt.  ↔ R5
- [x] (T6) Los empates de lastChangedAt se resuelven por categoryCompetitionId ascendente.  ↔ R6
- [x] (T7) Los filtros catalogQuery, catalogStatus, delegation y season conservan sus predicados actuales y el orden reciente se aplica sobre el conjunto filtrado.  ↔ R7
- [x] (T8) El límite existente de 200 resultados se aplica después de la ordenación, devolviendo las 200 competiciones con actividad más reciente que satisfagan los filtros.  ↔ R8
- [x] (T9) Las pruebas cubren descubrimiento, cambio, comprobación sin cambios, independencia de monitored, empate determinista y combinación con filtros.  ↔ R9
- [x] (T10) corepack pnpm typecheck, corepack pnpm lint, corepack pnpm test y diff-scope finalizan con código cero.  ↔ R10
- [x] Tests que cubran los criterios de aceptación
