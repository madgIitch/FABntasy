# sprint-39-rotating-market-blind-bids · Mercado rotatorio de agentes libres y pujas ciegas — Requisitos

- name: `Sprint 39 - Rotating Free-Agent Market & Blind Bidding` · priority: P0 · sdd: true
- aprobado por: peorr · 2026-09-24T18:25:49.364Z

## Contexto

Sustituir la compra directa de jugadores libres por ciclos de mercado de 24 horas con 12 jugadores rotatorios y pujas secretas, preservando ledger, ownership, roster, cláusulas y snapshots de jornada.

## Requisitos funcionales

R1. Un administrador puede iniciar Market V2 mediante un botón nuevo en Control de acceso. La activación global afecta a todas las ligas Fantasy existentes y futuras, sin activar el mercado por liga.
R2. Si el administrador inicia Market V2 a mitad del día, el primer ciclo comienza de inmediato y termina a la siguiente medianoche Europe/Madrid. Los siguientes ciclos van de 00:00 a 00:00; cada liga presenta como máximo 12 agentes libres por ciclo y deshabilita la compra libre directa.
R3. Los jugadores que no reciben adjudicación vuelven a la cola de rotación y pueden reaparecer en un ciclo posterior.
R4. Cada listing fija el precio de referencia vigente al abrirse; una puja activa debe igualarlo o superarlo.
R5. Cada manager autenticado solo puede consultar, sustituir o cancelar sus propias pujas antes del cierre.
R6. La suma de pujas activas reserva presupuesto y huecos de roster sin sobrecomprometer ninguno de los dos.
R7. El settlement usa importe descendente; si dos pujas tienen el mismo importe, gana la registrada primero, con ID estable como último desempate técnico. Es idempotente bajo workers concurrentes.
R8. La adjudicación crea una sola transferencia de ownership, roster y ledger, guarda acquisitionPrice y aplica la cláusula existente.
R9. Las pujas perdedoras, canceladas o invalidadas liberan reservas exactamente una vez y no producen débito económico.
R10. La rotación es determinista y prioriza a quienes llevan más tiempo sin aparecer.
R11. Deshabilitar Fantasy cancela ciclos abiertos y libera reservas sin borrar el histórico.
R12. Una adjudicación posterior al cutoff no altera el snapshot congelado de la jornada.
R13. Durante el ciclo las pujas rivales siguen ocultas. Después del cierre la liga ve ganador y precio adjudicado; cada postor ve si su puja fue adjudicada y el detalle de las demás pujas por ese jugador, incluidos importe y manager.
R14. Las pujas son específicas de un ciclo: la puja del día anterior queda en el histórico y no se presenta automáticamente al ciclo siguiente.
R15. Las pruebas cubren selección, pujas, reservas, desempates, visibilidad antes y después del cierre, elegibilidad, carreras, cutoff, suspensión e idempotencia.
R16. No hay acción administrativa para apagar Market V2 durante la temporada. La activación persiste para ligas actuales y futuras; el historial de ciclos y pujas queda conservado.

## Restricciones

- **error_states:** Las pujas válidas se ordenan por importe y antigüedad. Las invalidadas por cambios excepcionales liberan reservas y no generan adjudicación; se intenta la siguiente válida.
- **auth_secrets:** Identidad de sesión, permisos de liga y privacidad de pujas están fijados por los contratos actuales.
- **rollback_compat:** No existe acción administrativa de desactivar Market V2 durante la temporada. Los datos y el histórico se preservan; la suspensión excepcional de una competición Fantasy sigue cancelando sus ciclos y liberando reservas.
