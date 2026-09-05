# sprint-10-fantasy-team-roster · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) Existe una única FantasyTeam por usuario y competitionSeason según una constraint de base de datos, y ninguna petición puede leer o modificar equipos de otro usuario.  ↔ R1
- [ ] (T2) El modelo persiste roster y alineación por jornada con constraints que impiden repetir un playerRegistration dentro de la misma plantilla o alineación, incluso bajo escrituras concurrentes.  ↔ R2
- [ ] (T3) Las reglas versionadas de plantilla fijan presupuesto, número total de jugadores, titulares, suplentes y cupos por posición; el servidor valida todas las reglas en una única transacción.  ↔ R3
- [ ] (T4) El coste se calcula con aritmética decimal exacta o enteros en la unidad monetaria definida; gastar exactamente el presupuesto es válido y superarlo por la unidad mínima es rechazado.  ↔ R4
- [ ] (T5) Cada incorporación conserva el precio aplicable definido por el contrato, y la respuesta server-side devuelve presupuesto total, usado y restante sin depender de cálculos del cliente.  ↔ R5
- [ ] (T6) El cutoffAt se deriva server-side de datos persistidos de la jornada y una zona horaria explícita; el reloj enviado por el cliente se ignora.  ↔ R6
- [ ] (T7) Una mutación se rechaza con un código estable cuando el instante efectivo del servidor es mayor o igual que cutoffAt; transacciones concurrentes no pueden confirmar cambios después del cierre.  ↔ R7
- [ ] (T8) La alineación aceptada antes del cutoff queda almacenada como snapshot inmutable para esa jornada y continúa disponible en modo solo lectura aunque cambien roster, precio, posición o calendario posteriormente.  ↔ R8
- [ ] (T9) La API define esquema versionado, importes, timestamps, códigos HTTP y códigos de dominio estables para no autenticado, recurso ajeno o inexistente, duplicado, presupuesto excedido, composición inválida, jornada cerrada y conflicto concurrente.  ↔ R9
- [ ] (T10) La UI responsive distingue mediante texto y estructura, no solo color, titulares, banquillo, presupuesto usado y restante; incluye estados de carga, vacío, guardado, error, offline, conflicto y alineación congelada, y funciona desde 320 px sin scroll horizontal involuntario.  ↔ R10
- [ ] (T11) Las migraciones son aditivas, no alteran contratos deportivos ni de scoring existentes y permiten desactivar la nueva superficie sin borrar plantillas o snapshots históricos.  ↔ R11
- [ ] (T12) Tests unitarios y de integración cubren presupuesto exacto y exceso por unidad mínima, duplicados secuenciales y concurrentes, cada límite posicional, tamaños de plantilla, acceso ajeno, instante anterior e igual al cutoff, carrera concurrente durante el cutoff, snapshot inmutable y estados principales de UI; las pruebas temporales usan un reloj controlable y las constraints/transacciones se verifican en PostgreSQL real.  ↔ R12
- [ ] Tests que cubran los criterios de aceptación
