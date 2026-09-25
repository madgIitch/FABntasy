# sprint-40-manager-offers-transfer-listings · Ofertas entre mánagers, jugadores en venta y venta inmediata — Requisitos

- name: `Sprint 40 - Manager Offers, Transfer Listings & Instant Sale` · priority: P0 · sdd: true
- aprobado por: peorr · 2026-09-25T15:25:18.121Z

## Contexto

Añadir negociación privada entre mánagers, jugadores En venta, contraofertas, oferta automática de Canastio y venta inmediata al 80% sin sustituir el clausulazo.

## Requisitos funcionales

R1. Un manager puede ofertar créditos por cualquier jugador elegible de otro manager aunque no esté listado.
R2. El propietario puede aceptar, rechazar o contraofertar; cada oferta o contraoferta permanece privada entre las partes, caduca a las 48 horas y cada contraoferta reinicia ese plazo.
R3. Una propuesta activa reserva presupuesto y un hueco de roster del comprador y no permite sobrecompromiso.
R4. Aceptar una oferta mueve saldo, ownership y roster atómicamente, registra acquisitionPrice y reutiliza la cláusula de Sprint 13.
R5. Poner En venta no cambia ownership y publica al jugador para la liga durante 72 horas. El propietario puede indicar un precio deseado opcional, visible como señal de negociación; no ejecuta una venta automática ni sustituye la cláusula.
R6. Los listings de managers no consumen los 12 huecos del mercado de agentes libres.
R7. Canastio no oferta al publicar el listing. En el siguiente cambio de ciclo de 00:00 Europe/Madrid crea como máximo una oferta activa por listing por el 100% del valor de mercado vigente al generarla; la anterior caduca y se renueva en cada ciclo mientras el listing siga En venta.
R8. Aceptar la oferta de Canastio deja al jugador libre y elegible para ciclos futuros sin insertarlo a la fuerza en el ciclo actual.
R9. Venta inmediata paga el 80% del valor vigente y exige reconfirmación si cambia el quote autoritativo.
R10. Cualquier cambio de ownership invalida ofertas/listings incompatibles y libera reservas exactamente una vez.
R11. El clausulazo sigue siendo no rechazable según Sprint 13 y gana las carreras de forma transaccional sin dobles resultados.
R12. Los snapshots congelados de la jornada no se reescriben aunque el ownership cambie después del cutoff.
R13. La UI distingue claramente negociar, listar, vender inmediatamente y pagar cláusula.
R14. Tests cubren ofertas, contraofertas, listing, oferta del sistema, venta inmediata, quote cambiado, carreras, disable, privacidad e idempotencia.

## Restricciones

- **error_states:** Caducidad, saldo/capacidad insuficientes, propiedad cambiante, competición suspendida y quote obsoleto deben devolver resultados estables.
- **auth_secrets:** Supabase Auth y membresía activa; ofertas privadas solo visibles a las partes, anuncio visible a la liga.
- **rollback_compat:** Migración aditiva e historial preservado; venta anterior al 100 % se reemplaza explícitamente por venta inmediata al 80 % al activar Sprint 40.
