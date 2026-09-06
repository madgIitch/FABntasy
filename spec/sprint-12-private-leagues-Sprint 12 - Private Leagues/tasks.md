# sprint-12-private-leagues Â· undefined â€” Tareas

Checklist de implementaciÃ³n. El agente marca [x] al completar; los gates verifican.

- [x] (T1) AC1: Un usuario autenticado puede crear una liga privada para una competitionSeason y queda como owner y miembro activo en una sola transacciÃ³n.  â†” R1
- [x] (T2) AC2: Una liga admite como mÃ¡ximo 20 miembros activos incluyendo al owner; dos uniones concurrentes al Ãºltimo hueco no exceden el lÃ­mite.  â†” R2
- [x] (T3) AC3: Los tokens de invitaciÃ³n contienen al menos 128 bits aleatorios, no exponen IDs internos, se persisten solo como SHA-256 y no aparecen en logs.  â†” R3
- [x] (T4) AC4: El owner puede revocar o regenerar la invitaciÃ³n; una invitaciÃ³n revocada o expirada rechaza nuevas uniones sin afectar miembros existentes.  â†” R4
- [x] (T5) AC5: Un usuario no puede tener dos memberships activas en la misma liga; abandonar y volver crea o reactiva estado sin duplicar membresÃ­a activa.  â†” R5
- [x] (T6) AC6: La landing de invitaciÃ³n solo expone nombre, competiciÃ³n y ocupaciÃ³n, y conserva la intenciÃ³n durante login/registro en una cookie segura de 24 horas.  â†” R6
- [x] (T7) AC7: FantasyTeam es Ãºnico por usuario y liga; un mismo usuario puede tener plantillas, precios pagados y propietarios diferentes en ligas distintas.  â†” R7
- [x] (T8) AC8: PlayerPrice sigue siendo global y no se duplica ni modifica al crear, unir o abandonar una liga.  â†” R8
- [x] (T9) AC9: La migraciÃ³n asigna cada equipo existente a una liga personal de compatibilidad sin cambiar roster, lineup, snapshots, acquisitionPrice, versiÃ³n ni scores.  â†” R9
- [x] (T10) AC10: Solo miembros pueden leer la ficha y sus miembros; inexistencia y acceso no autorizado responden igual mediante 404 LEAGUE_NOT_FOUND.  â†” R10
- [x] (T11) AC11: Solo el owner puede gestionar invitaciones o eliminar la liga; el owner no puede abandonarla y la eliminaciÃ³n con miembros exige confirmaciÃ³n explÃ­cita y expectedVersion.  â†” R11
- [x] (T12) AC12: Crear, unir, abandonar, revocar y eliminar son operaciones transaccionales e idempotentes frente a reintentos definidos, sin escrituras parciales.  â†” R12
- [x] (T13) AC13: La API usa el envelope `fantasy-league-api.v1`, identidad de sesiÃ³n, importes/fechas serializables y cÃ³digos de error estables; nunca acepta userId como actor.  â†” R13
- [x] (T14) AC14: `/app/ligas`, la ficha y `/liga/[token]` cubren carga, vacÃ­o, llena, invitaciÃ³n invÃ¡lida/expirada/revocada, conflicto, offline y confirmaciÃ³n, sin scroll horizontal desde 320 px.  â†” R14
- [x] (T15) AC15: Un flag server-side bloquea mutaciones con FEATURE_DISABLED y conserva todas las lecturas histÃ³ricas.  â†” R15
- [x] (T16) AC16: Tests de dominio, PostgreSQL y E2E cubren permisos, tokens, capacidad concurrente, crear, compartir, login/registro, unirse, reingresar, revocar, abandonar y migrar equipos, sin red FAB.  â†” R16
- [x] Tests que cubran los criterios de aceptaciÃ³n

