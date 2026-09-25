# sprint-40-manager-offers-transfer-listings · Ofertas entre mánagers, jugadores en venta y venta inmediata — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) Un manager puede ofertar créditos por cualquier jugador elegible de otro manager aunque no esté listado.  ↔ R1
- [x] (T2) El propietario puede aceptar, rechazar o contraofertar; cada oferta o contraoferta permanece privada entre las partes, caduca a las 48 horas y cada contraoferta reinicia ese plazo.  ↔ R2
- [x] (T3) Una propuesta activa reserva presupuesto y un hueco de roster del comprador y no permite sobrecompromiso.  ↔ R3
- [x] (T4) Aceptar una oferta mueve saldo, ownership y roster atómicamente, registra acquisitionPrice y reutiliza la cláusula de Sprint 13.  ↔ R4
- [x] (T5) Poner En venta no cambia ownership y publica al jugador para la liga durante 72 horas. El propietario puede indicar un precio deseado opcional, visible como señal de negociación; no ejecuta una venta automática ni sustituye la cláusula.  ↔ R5
- [x] (T6) Los listings de managers no consumen los 12 huecos del mercado de agentes libres.  ↔ R6
- [x] (T7) Canastio no oferta al publicar el listing. En el siguiente cambio de ciclo de 00:00 Europe/Madrid crea como máximo una oferta activa por listing por el 100% del valor de mercado vigente al generarla; la anterior caduca y se renueva en cada ciclo mientras el listing siga En venta.  ↔ R7
- [x] (T8) Aceptar la oferta de Canastio deja al jugador libre y elegible para ciclos futuros sin insertarlo a la fuerza en el ciclo actual.  ↔ R8
- [x] (T9) Venta inmediata paga el 80% del valor vigente y exige reconfirmación si cambia el quote autoritativo.  ↔ R9
- [x] (T10) Cualquier cambio de ownership invalida ofertas/listings incompatibles y libera reservas exactamente una vez.  ↔ R10
- [x] (T11) El clausulazo sigue siendo no rechazable según Sprint 13 y gana las carreras de forma transaccional sin dobles resultados.  ↔ R11
- [x] (T12) Los snapshots congelados de la jornada no se reescriben aunque el ownership cambie después del cutoff.  ↔ R12
- [x] (T13) La UI distingue claramente negociar, listar, vender inmediatamente y pagar cláusula.  ↔ R13
- [x] (T14) Tests cubren ofertas, contraofertas, listing, oferta del sistema, venta inmediata, quote cambiado, carreras, disable, privacidad e idempotencia.  ↔ R14
- [x] Tests que cubran los criterios de aceptación

## Verificación

- Integración PostgreSQL local `canastio_test`: privacidad, contraofertas, expiración, renovación de Canastio, cotización, idempotencia, carreras y suspensión Fantasy.
- Revisión visual móvil: 320, 375, 768, 1024 y 1440 px, sin desbordes ni errores graves de accesibilidad.
- Gates del harness: aprobados con E2E dirigido a Canastio en `127.0.0.1:3001`.
