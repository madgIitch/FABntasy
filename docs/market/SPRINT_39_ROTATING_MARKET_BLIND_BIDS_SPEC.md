# Sprint 39 · Mercado rotatorio y pujas ciegas

Estado: `done` por solicitud del usuario el 2026-09-25, tras la revisión de la interfaz en producción y con todos los gates aprobados.

## Decisiones de producto

- Un administrador inicia Market V2 desde un botón nuevo en **Control de acceso**. La activación es global para todas las ligas Fantasy existentes y futuras. No hay botón administrativo para apagarlo durante la temporada.
- Si se activa durante el día, el primer ciclo abre inmediatamente y termina a la medianoche siguiente. Después, cada ciclo abre a las 00:00 y cierra a las 00:00 del día siguiente en `Europe/Madrid`.
- Cada liga muestra hasta 12 agentes libres por ciclo. La compra libre directa deja de estar disponible tras la activación. Quienes no sean fichados regresan a la cola y podrán volver a salir.
- Cada listing fija un precio de referencia. Los managers pueden pujar por al menos ese importe, modificar su puja o cancelarla antes del cierre. La puja reserva saldo y hueco de plantilla.
- Gana el mayor importe. En empate gana la puja registrada primero; el ID estable solo resuelve una coincidencia técnica de timestamp. Dos workers no pueden producir dos adjudicaciones.
- Durante el ciclo cada manager ve solo su puja. Al cierre, toda la liga ve ganador y precio; cada postor ve el resultado propio y el importe y manager de las demás pujas por ese jugador.
- Las pujas pertenecen al ciclo en que se hicieron. Una puja no adjudicada no se traslada automáticamente al día siguiente. El jugador vuelve a la cola.
- La adjudicación conserva ledger, propiedad, plantilla, precio de adquisición, cláusulas y snapshots de jornada. Una puja excepcionalmente invalidada no debe generar débito ni adjudicación; se evalúa la siguiente válida.
- Cada petición de puja o cancelación guarda una clave de idempotencia inmutable; repetir una petición anterior no modifica una puja cambiada después.
- La suspensión de Fantasy para una competición sigue cancelando sus ciclos abiertos y liberando reservas. Esto es una medida excepcional distinta de apagar globalmente Market V2.

## Presentación del mercado

Con Market V2 activo, `/app/mercado` muestra una sola lista de agentes libres del ciclo. La búsqueda, filtros y ficha resumida de todos los jugadores están en `Mercado → Explorar jugadores` (`/app/mercado?view=explore`), donde siguen disponibles las acciones de venta, blindaje, inversión en cláusula y clausulazo. Los jugadores libres fuera del ciclo figuran como no disponibles hoy. Las filas de puja usan nombres legibles y precios en millones, y el resumen distingue saldo libre, créditos comprometidos en pujas y huecos realmente disponibles.

## Contratos previos

- [Mercado y transacciones](../MARKET_TRANSACTIONS.md)
- [Precios de jugadores](../PLAYER_PRICING.md)
- [Deshabilitar Fantasy para una competición](../operations/FANTASY_COMPETITION_DISABLE_SPEC.md)

Los criterios de aceptación completos y el scope propuesto están en `spec.json` bajo `sprint-39-rotating-market-blind-bids`.

## Operación del cierre

La página y API del mercado liquidan el ciclo vencido antes de servir datos o aceptar pujas. Un cron de Vercel también llama diariamente a `/api/internal/market-v2` a las 23:00 UTC, que coincide con la medianoche de invierno en Madrid. En horario de verano, el primer acceso tras medianoche efectúa el cierre; el cron actúa como respaldo a la 01:00 local. Vercel no garantiza precisión exacta del disparo. La ruta exige `CRON_SECRET` (o `MARKET_V2_JOB_SECRET` para un scheduler externo) como Bearer y no devuelve datos de pujas. Configurar ese secreto en el entorno de Vercel antes de activar Market V2. El botón de activación no debe pulsarse hasta que la migración y el cron estén desplegados y probados.
