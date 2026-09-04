# Implementación · sprint-3-active-competition-discovery

Estado: `in_progress`.

Completado:

- Contrato real de `fasesGrupos` validado mediante `/v2/equipo.ashx` e `id_equipo`.
- Respuesta confirmada con fase de grupos, grupos A/B y clasificación FIBA.
- CLI de discovery seguro y selección explícita por `IdCompeticionCategoria`.
- Copa Delegación 2026 masculina de Sevilla (`10468`) persistida en Supabase con rol `validation`.
- RAW de discovery almacenado con saneado de secretos.
- Migración de roles de competición aplicada en Supabase.
- Contrato de categoría extraído de la APK y validado contra FAB real: `fasesGrupos` y `equipos` en `/v2/categoria.ashx`.
- Fixtures de contrato anonimizadas para fases/grupos y equipos.
- Comando `sync-competition-teams --category-id 10468` implementado con persistencia RAW saneada e idempotente.
- Copa Delegación sincronizada dos veces con el mismo resultado: 3 fases, 4 grupos, 12 equipos únicos y 2 marcadores `DESCANSA` omitidos.
- 23 tests aprobados, incluidos los 2 tests PostgreSQL contra Supabase con rollback; Ruff y Prisma Validate aprobados.

Pendiente:

- Cierre formal del spec tras revisión del usuario.
