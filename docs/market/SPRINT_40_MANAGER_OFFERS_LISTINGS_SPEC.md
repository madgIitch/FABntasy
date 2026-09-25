# Sprint 40 · Ofertas entre mánagers, jugadores en venta y venta inmediata

Estado: spec aprobada (`spec_approved: true`); implementación completada, revisión humana pendiente.

## Decisiones de producto registradas el 25/09/2026

- Un mánager puede hacer una oferta privada por un jugador rival aunque no figure «En venta». El propietario puede aceptar, rechazar o contraofertar. Una oferta o contraoferta caduca a las **48 horas**; cada contraoferta inicia otras 48 horas.
- «Poner en venta» publica al jugador durante **72 horas** sin cambiar de propietario. Puede incluir un **precio deseado opcional**. Si queda vacío, la ficha indica «Escucha ofertas». Si se informa, es una referencia negociable, no un precio de compra automática ni un reemplazo de la cláusula. El propietario sigue aceptando la operación.
- Canastio **no oferta inmediatamente** al publicar. La primera oferta llega en el siguiente cambio de ciclo del mercado de agentes libres: **00:00 Europe/Madrid** según Sprint 39. Es del **100 % del valor de mercado vigente al generarla**. Cada oferta caduca al siguiente cambio de ciclo; si el anuncio sigue activo, Canastio calcula una nueva oferta con el valor entonces vigente. Como máximo hay una oferta activa de Canastio por anuncio y ciclo.
- La **venta inmediata** paga el **80 % del valor vigente** y necesita una cotización autoritativa del servidor con reconfirmación si cambia. Este camino sustituye la venta actual al sistema al 100 %; esperar al siguiente ciclo y aceptar la oferta de Canastio permite cobrar el 100 % del valor de ese momento.
- «Pagar cláusula» conserva la mecánica no rechazable del Sprint 13. No se confunde con «Hacer oferta», «Poner en venta» ni «Venta inmediata».

## Tres relojes

| Operación | Duración o momento |
| --- | --- |
| Mercado de agentes libres | Ciclos diarios de 00:00 a 00:00 Europe/Madrid |
| Oferta o contraoferta privada | 48 horas desde la propuesta vigente |
| Anuncio «En venta» | 72 horas desde su publicación |
| Oferta de Canastio | Del cambio de ciclo que la genera al siguiente, mientras el anuncio siga activo |

El ejemplo externo de las 05:00 describe el concepto de siguiente cambio de ciclo; Canastio usa las 00:00 fijadas en Sprint 39.

## Contratos que conserva Sprint 40

- El anuncio y el precio deseado no transfieren ownership. Una oferta aceptada sí mueve saldo, plantilla y ownership en una transacción con ledger y `acquisitionPrice`.
- Las propuestas activas hechas por el comprador reservan presupuesto y huecos junto con las pujas de agentes libres. Una contraoferta hecha por el vendedor no reserva recursos del comprador hasta que este la acepta; en ese momento se revalida saldo, huecos y límite de equipo real. Cualquier cambio de propiedad invalida ofertas y anuncios incompatibles sin dobles cargos.
- La oferta de Canastio deja libre al jugador cuando el propietario la acepta; podrá volver a ciclos futuros sin añadirlo al ciclo ya abierto.
- Los snapshots congelados de jornada no se reescriben y una competición Fantasy deshabilitada no admite operaciones nuevas.

Los criterios de aceptación completos y el scope propuesto están en `spec.json` bajo `sprint-40-manager-offers-transfer-listings`. La comparación con otros fantasy llegó como material aportado por el usuario; estas reglas son decisiones aprobadas para Canastio, no una certificación independiente de esa documentación externa.

## Verificación de implementación

La migración aditiva se aplicó en una base PostgreSQL local desechable. La prueba de integración cubre privacidad, reservas, contraofertas, aceptación, expiración, renovación de la oferta de Canastio, venta inmediata con cotización cambiada, idempotencia, carreras con clausulazo/venta y suspensión Fantasy. La vista de traspasos pasó la revisión visual y de accesibilidad en cinco anchuras.
