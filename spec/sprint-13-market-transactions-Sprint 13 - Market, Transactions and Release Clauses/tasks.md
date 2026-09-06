# sprint-13-market-transactions · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) Cada jugador tiene como máximo un propietario activo por liga y una compra de jugador libre usa su valor global vigente.  ↔ R1
- [ ] (T2) El saldo inicial es el presupuesto del ruleset menos los precios de adquisición de la plantilla y todo movimiento posterior queda en un ledger inmutable.  ↔ R2
- [ ] (T3) Comprar, vender o clausular actualiza saldo, propiedad, roster e histórico en una única transacción serializable.  ↔ R3
- [ ] (T4) Dos operaciones concurrentes no pueden producir saldo negativo, doble propiedad, duplicados de roster ni superar sus límites.  ↔ R4
- [ ] (T5) La venta devuelve el valor global vigente, libera al jugador y puede dejar la plantilla incompleta; una alineación incompleta sigue siendo inválida.  ↔ R5
- [ ] (T6) La cláusula es 1,75 × max(precio pagado, valor vigente), más la inversión del propietario actual.  ↔ R6
- [ ] (T7) Cada crédito invertido consume saldo y añade dos créditos de cláusula; la inversión no se reembolsa y se reinicia al cambiar el propietario.  ↔ R7
- [ ] (T8) El clausulazo no puede rechazarse, paga el 100 % al propietario anterior y registra como nuevo precio de adquisición el importe total abonado.  ↔ R8
- [ ] (T9) Cada usuario puede activar un blindaje de 24 horas sobre un jugador propio por jornada.  ↔ R9
- [ ] (T10) Un jugador recién adquirido queda protegido hasta el comienzo de la siguiente jornada y, tras recibir un clausulazo, el resto de la plantilla queda protegido hasta esa jornada.  ↔ R10
- [ ] (T11) Cada usuario puede realizar como máximo un clausulazo y recibir como máximo uno por jornada.  ↔ R11
- [ ] (T12) Los clausulazos cierran 24 horas antes del primer partido autoritativo de la jornada y permanecen cerrados durante ella; las alineaciones ya congeladas no cambian.  ↔ R12
- [ ] (T13) Precio ausente, jugador no elegible, protección, cutoff, límites o conflicto concurrente fallan con código estable sin cambios parciales.  ↔ R13
- [ ] (T14) La API obtiene usuario y liga autorizados server-side y devuelve importes enteros, timestamps UTC y el resultado definitivo de cada operación.  ↔ R14
- [ ] (T15) La UI ofrece búsqueda y filtros, muestra valor, adquisición, plusvalía, cláusula, protección y cierre, y confirma saldo y plantilla resultantes antes de mutar.  ↔ R15
- [ ] (T16) Las compras y la popularidad se muestran solo como información y no alteran el algoritmo global de precios.  ↔ R16
- [ ] (T17) Tests unitarios y de integración cubren reglas económicas, límites temporales, concurrencia, autorización y respuestas de error.  ↔ R17
- [ ] Tests que cubran los criterios de aceptación
