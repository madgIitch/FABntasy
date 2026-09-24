# sprint-39-rotating-market-blind-bids · Mercado rotatorio de agentes libres y pujas ciegas — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `packages/domain/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** El administrador inicia globalmente Market V2 desde Control de acceso; rige para ligas existentes y futuras.
- **external_contracts:** Los ciclos son 00:00–00:00 en Europe/Madrid; si el administrador inicia durante el día, el primer ciclo abre de inmediato y termina en la medianoche siguiente.
- **edge_cases:** Los jugadores no fichados regresan a la cola y podrán reaparecer en otro ciclo; el usuario no requiere una regla especial de inventario escaso.
- **ui_states:** Durante el ciclo cada manager ve solo su puja. Tras el cierre, la liga ve ganador y precio; los postores ven el resultado propio y los importes e identidad de las demás pujas de ese jugador.

## Decisiones de la entrevista

- **data_model:** El administrador inicia el mercado desde un botón nuevo de Control de acceso para todas las ligas Fantasy existentes y futuras.
- **edge_cases:** No hace falta tratar la escasez de jugadores como preocupación de producto. Quienes no sean fichados vuelven a la cola y saldrán de nuevo más adelante.
- **external_contracts:** El ciclo va de 00:00 a 00:00 del día siguiente.
- **error_states:** La única concurrencia de producto que preocupa es una puja simultánea por el mismo jugador y precio; gana quien pujó primero. No se requiere otra regla especial de adjudicación para el caso excepcional de una puja invalidada.
- **ui_states:** Al cierre se muestra ganador y precio. El resto de postores ve que no obtuvo el jugador y también la información de las otras pujas por ese jugador.
- **activation_timing:** Sí: si el administrador activa a mitad del día, comienza un primer ciclo corto hasta la medianoche siguiente.
