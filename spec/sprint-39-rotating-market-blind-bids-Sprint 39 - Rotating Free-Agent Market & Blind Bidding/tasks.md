# sprint-39-rotating-market-blind-bids · Mercado rotatorio de agentes libres y pujas ciegas — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) Un administrador puede iniciar Market V2 mediante un botón nuevo en Control de acceso. La activación global afecta a todas las ligas Fantasy existentes y futuras, sin activar el mercado por liga.  ↔ R1
- [x] (T2) Si el administrador inicia Market V2 a mitad del día, el primer ciclo comienza de inmediato y termina a la siguiente medianoche Europe/Madrid. Los siguientes ciclos van de 00:00 a 00:00; cada liga presenta como máximo 12 agentes libres por ciclo y deshabilita la compra libre directa.  ↔ R2
- [x] (T3) Los jugadores que no reciben adjudicación vuelven a la cola de rotación y pueden reaparecer en un ciclo posterior.  ↔ R3
- [x] (T4) Cada listing fija el precio de referencia vigente al abrirse; una puja activa debe igualarlo o superarlo.  ↔ R4
- [x] (T5) Cada manager autenticado solo puede consultar, sustituir o cancelar sus propias pujas antes del cierre.  ↔ R5
- [x] (T6) La suma de pujas activas reserva presupuesto y huecos de roster sin sobrecomprometer ninguno de los dos.  ↔ R6
- [x] (T7) El settlement usa importe descendente; si dos pujas tienen el mismo importe, gana la registrada primero, con ID estable como último desempate técnico. Es idempotente bajo workers concurrentes.  ↔ R7
- [x] (T8) La adjudicación crea una sola transferencia de ownership, roster y ledger, guarda acquisitionPrice y aplica la cláusula existente.  ↔ R8
- [x] (T9) Las pujas perdedoras, canceladas o invalidadas liberan reservas exactamente una vez y no producen débito económico.  ↔ R9
- [x] (T10) La rotación es determinista y prioriza a quienes llevan más tiempo sin aparecer.  ↔ R10
- [x] (T11) Deshabilitar Fantasy cancela ciclos abiertos y libera reservas sin borrar el histórico.  ↔ R11
- [x] (T12) Una adjudicación posterior al cutoff no altera el snapshot congelado de la jornada.  ↔ R12
- [x] (T13) Durante el ciclo las pujas rivales siguen ocultas. Después del cierre la liga ve ganador y precio adjudicado; cada postor ve si su puja fue adjudicada y el detalle de las demás pujas por ese jugador, incluidos importe y manager.  ↔ R13
- [x] (T14) Las pujas son específicas de un ciclo: la puja del día anterior queda en el histórico y no se presenta automáticamente al ciclo siguiente.  ↔ R14
- [x] (T15) Las pruebas cubren selección, pujas, reservas, desempates, visibilidad antes y después del cierre, elegibilidad, carreras, cutoff, suspensión e idempotencia.  ↔ R15
- [x] (T16) No hay acción administrativa para apagar Market V2 durante la temporada. La activación persiste para ligas actuales y futuras; el historial de ciclos y pujas queda conservado.  ↔ R16
- [x] Tests que cubran los criterios de aceptación
