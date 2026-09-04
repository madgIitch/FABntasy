# sprint-3-active-competition-discovery · undefined — Requisitos

- name: `Sprint 3 - Active Competition Discovery` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-04T22:31:36.985Z

## Contexto



## Requisitos funcionales

R1. AC1: `discover-categories --query <texto>` llama únicamente a `buscarCategoria`, pagina secuencialmente y muestra candidatos con `Id`, `IdCompeticionCategoria`, `NombreCategoria`, `NombreCompeticion` y `NombreDelegacion`, sin credenciales ni payload completo.
R2. AC2: `select-competition --category-id <IdCompeticionCategoria> --role <validation|primary>` exige coincidencia única obtenida de FAB, persiste todos sus IDs/nombres/delegación y crea o actualiza idempotentemente CompetitionSeason sin inferir la temporada desde `NombreCompeticion`; la Copa Delegación 2026 masculina de Sevilla (`IdCompeticionCategoria=10468`) se configura inicialmente con rol `validation`.
R3. AC3: Tras la selección, toda sincronización usa los IDs persistidos; el texto de discovery no se guarda como dependencia operativa ni se reutiliza para identificar la competición.
R4. AC4: Solo una CompetitionSeason puede tener `primary_fantasy_competition=true`; una competición `validation` puede alimentar pruebas reales del backend sin convertirse en la competición primaria, y cualquier cambio de rol es transaccional.
R5. AC5: `FabClient.get_category_phases(id_categoria_competicion)` usa exclusivamente POST form-urlencoded `/v2/categoria.ashx` con `accion=fasesGrupos`, credenciales e ID opaco de categoría; su respuesta real se valida y anonimiza en fixture antes de mapear grupos.
R6. AC6: `FabClient.get_category_teams(...)` usa el contrato confirmado de la APK y FAB real: `/v2/categoria.ashx`, `accion=equipos`, `id_fase`, `id_grupo`, `jornada`, `tipo_fase` y `ventana`; una respuesta incompatible conserva RAW saneado y bloquea la sincronización.
R7. AC7: Equipos validados se persisten idempotentemente con sus external IDs y TeamRegistration ligada a CompetitionSeason; Group solo se asigna cuando FAB lo expone inequívocamente, sin deducirlo por nombre.
R8. AC8: Toda respuesta FAB usada por discovery o sync queda en RawFabPayload con checksum y sin `key`, `id_dispositivo`, token, password ni secret.
R9. AC9: Tests sin red cubren discovery, selección, respuestas vacías/ambiguas, reintento idempotente, bloqueo de contratos desconocidos y ausencia de secretos; integración contra PostgreSQL verifica unicidad primaria y rollback.

## Restricciones

- **error_states:** Discovery vacío no modifica la selección actual; IDs ambiguos o inexistentes fallan; respuestas no validadas de `fasesGrupos`/`equipos` se guardan saneadas para diagnóstico y bloquean la sincronización antes de inventar un mapeo.
- **auth_secrets:** Todas las llamadas pasan por FabClient y FileCredentialStore; CLI y logs muestran solo IDs deportivos y nombres, nunca credenciales; RAW se sanea con el contrato del Sprint 2.
- **rollback_compat:** Cambiar la competición primaria requiere transacción; un fallo conserva la anterior. La migración solo añade metadatos/constraint de selección y puede revertirse en desarrollo.
