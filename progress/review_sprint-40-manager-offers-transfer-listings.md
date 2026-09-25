# Sprint 40 · Revisión de implementación

Estado: `review_pending`.

## Entregado

- Ofertas privadas y contraofertas de 48 horas, reservas del comprador y privacidad entre las partes.
- Anuncios públicos de 72 horas con precio deseado opcional.
- Oferta de Canastio al 100 % desde el siguiente ciclo de medianoche, renovada por ciclo.
- Venta inmediata al 80 % con cotización del servidor y reconfirmación si cambia.
- Transacciones con ledger, invalidación cruzada, idempotencia y soporte de suspensión Fantasy.
- UI de traspasos separada de pujas diarias y clausulazos.

## Verificado

- Migración aplicada en PostgreSQL local desechable `canastio_test`.
- Integración PostgreSQL: privacidad, reservas, contraofertas, expiración, renovación, cotización, idempotencia, carreras con venta inmediata y clausulazo, suspensión Fantasy.
- Revisión visual y de accesibilidad en 320, 375, 768, 1024 y 1440 px sin desbordes ni incidencias graves.
- Gates del harness aprobados con E2E dirigido al servidor Canastio en `127.0.0.1:3001`.

## Pendiente para cerrar

Smoke test humano en la app: dos managers negocian un jugador, un propietario publica y acepta una oferta de Canastio tras el cambio diario, y se confirma una venta inmediata con cotización actualizada. Después, ejecutar `node .harness/spec.mjs done sprint-40-manager-offers-transfer-listings`.
