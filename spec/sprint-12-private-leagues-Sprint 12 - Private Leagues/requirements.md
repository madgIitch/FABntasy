# sprint-12-private-leagues · undefined — Requisitos

- name: `Sprint 12 - Private Leagues` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-06T01:35:07.196Z

## Contexto



## Requisitos funcionales

R1. AC1: Un usuario autenticado puede crear una liga privada para una competitionSeason y queda como owner y miembro activo en una sola transacción.
R2. AC2: Una liga admite como máximo 20 miembros activos incluyendo al owner; dos uniones concurrentes al último hueco no exceden el límite.
R3. AC3: Los tokens de invitación contienen al menos 128 bits aleatorios, no exponen IDs internos, se persisten solo como SHA-256 y no aparecen en logs.
R4. AC4: El owner puede revocar o regenerar la invitación; una invitación revocada o expirada rechaza nuevas uniones sin afectar miembros existentes.
R5. AC5: Un usuario no puede tener dos memberships activas en la misma liga; abandonar y volver crea o reactiva estado sin duplicar membresía activa.
R6. AC6: La landing de invitación solo expone nombre, competición y ocupación, y conserva la intención durante login/registro en una cookie segura de 24 horas.
R7. AC7: FantasyTeam es único por usuario y liga; un mismo usuario puede tener plantillas, precios pagados y propietarios diferentes en ligas distintas.
R8. AC8: PlayerPrice sigue siendo global y no se duplica ni modifica al crear, unir o abandonar una liga.
R9. AC9: La migración asigna cada equipo existente a una liga personal de compatibilidad sin cambiar roster, lineup, snapshots, acquisitionPrice, versión ni scores.
R10. AC10: Solo miembros pueden leer la ficha y sus miembros; inexistencia y acceso no autorizado responden igual mediante 404 LEAGUE_NOT_FOUND.
R11. AC11: Solo el owner puede gestionar invitaciones o eliminar la liga; el owner no puede abandonarla y la eliminación con miembros exige confirmación explícita y expectedVersion.
R12. AC12: Crear, unir, abandonar, revocar y eliminar son operaciones transaccionales e idempotentes frente a reintentos definidos, sin escrituras parciales.
R13. AC13: La API usa el envelope `fantasy-league-api.v1`, identidad de sesión, importes/fechas serializables y códigos de error estables; nunca acepta userId como actor.
R14. AC14: `/app/ligas`, la ficha y `/liga/[token]` cubren carga, vacío, llena, invitación inválida/expirada/revocada, conflicto, offline y confirmación, sin scroll horizontal desde 320 px.
R15. AC15: Un flag server-side bloquea mutaciones con FEATURE_DISABLED y conserva todas las lecturas históricas.
R16. AC16: Tests de dominio, PostgreSQL y E2E cubren permisos, tokens, capacidad concurrente, crear, compartir, login/registro, unirse, reingresar, revocar, abandonar y migrar equipos, sin red FAB.

## Restricciones

- **error_states:** Errores observables y atomicidad definidos.
- **auth_secrets:** Actor server-side y tokens hasheados.
- **rollback_compat:** Equipos existentes migran a ligas personales.

