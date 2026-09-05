# sprint-10-fantasy-team-roster · undefined — Requisitos

- name: `Sprint 10 - Fantasy Team and Roster` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-05T23:17:29.437Z

## Contexto



## Requisitos funcionales

R1. Existe una única FantasyTeam por usuario y competitionSeason según una constraint de base de datos, y ninguna petición puede leer o modificar equipos de otro usuario.
R2. El modelo persiste roster y alineación por jornada con constraints que impiden repetir un playerRegistration dentro de la misma plantilla o alineación, incluso bajo escrituras concurrentes.
R3. Las reglas versionadas de plantilla fijan presupuesto, número total de jugadores, titulares, suplentes y cupos por posición; el servidor valida todas las reglas en una única transacción.
R4. El coste se calcula con aritmética decimal exacta o enteros en la unidad monetaria definida; gastar exactamente el presupuesto es válido y superarlo por la unidad mínima es rechazado.
R5. Cada incorporación conserva el precio aplicable definido por el contrato, y la respuesta server-side devuelve presupuesto total, usado y restante sin depender de cálculos del cliente.
R6. El cutoffAt se deriva server-side de datos persistidos de la jornada y una zona horaria explícita; el reloj enviado por el cliente se ignora.
R7. Una mutación se rechaza con un código estable cuando el instante efectivo del servidor es mayor o igual que cutoffAt; transacciones concurrentes no pueden confirmar cambios después del cierre.
R8. La alineación aceptada antes del cutoff queda almacenada como snapshot inmutable para esa jornada y continúa disponible en modo solo lectura aunque cambien roster, precio, posición o calendario posteriormente.
R9. La API define esquema versionado, importes, timestamps, códigos HTTP y códigos de dominio estables para no autenticado, recurso ajeno o inexistente, duplicado, presupuesto excedido, composición inválida, jornada cerrada y conflicto concurrente.
R10. La UI responsive distingue mediante texto y estructura, no solo color, titulares, banquillo, presupuesto usado y restante; incluye estados de carga, vacío, guardado, error, offline, conflicto y alineación congelada, y funciona desde 320 px sin scroll horizontal involuntario.
R11. Las migraciones son aditivas, no alteran contratos deportivos ni de scoring existentes y permiten desactivar la nueva superficie sin borrar plantillas o snapshots históricos.
R12. Tests unitarios y de integración cubren presupuesto exacto y exceso por unidad mínima, duplicados secuenciales y concurrentes, cada límite posicional, tamaños de plantilla, acceso ajeno, instante anterior e igual al cutoff, carrera concurrente durante el cutoff, snapshot inmutable y estados principales de UI; las pruebas temporales usan un reloj controlable y las constraints/transacciones se verifican en PostgreSQL real.

## Restricciones

- **error_states:** Se fijan 401 AUTH_REQUIRED; 404 TEAM_NOT_FOUND para inexistencia o acceso no autorizado; 409 PLAYER_DUPLICATE, TEAM_LIMIT_EXCEEDED, BUDGET_EXCEEDED, ROSTER_INVALID, LINEUP_LOCKED, CUTOFF_UNAVAILABLE, VERSION_CONFLICT, PRICE_UNAVAILABLE y FEATURE_DISABLED; y 422 INVALID_INPUT para payload sintácticamente válido pero inválido según el contrato. Todos usan el envelope versionado fantasy-team-api.v1 sin detalles internos.
- **auth_secrets:** El actor procede exclusivamente de la sesión server-side. Solo el propietario puede modificar y, hasta Sprint 13, leer. La futura lectura compartida dependerá de una política server-side de liga privada. Inexistencia y acceso no autorizado son indistinguibles mediante 404 TEAM_NOT_FOUND. No se introducen secretos nuevos.
- **rollback_compat:** Las migraciones y contratos son aditivos; roster y snapshots históricos se conservan indefinidamente. Un flag server-side desactiva las mutaciones con 409 FEATURE_DISABLED mientras los GET históricos siguen disponibles con 200 en solo lectura, sin borrar datos ni alterar contratos deportivos, de autenticación o scoring.

