# sprint-40-manager-offers-transfer-listings · Ofertas entre mánagers, jugadores en venta y venta inmediata — Diseño

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

- **data_model:** Ofertas privadas, propuestas inmutables, anuncios con precio deseado opcional, ofertas de Canastio por ciclo y transacciones con ledger.
- **external_contracts:** No hay nueva API externa; Canastio usa precio de mercado propio y el ciclo diario de Sprint 39.
- **edge_cases:** Aceptación, clausulazo, venta inmediata y settlement concurrentes se resuelven sin doble ownership ni cargo.
- **ui_states:** Negociar, listar, venta inmediata y cláusula son acciones distintas; precio deseado y oferta de sistema muestran vigencia.

## Decisiones de la entrevista

- **listing_price:** Precio deseado opcional. Vacío significa «Escucha ofertas»; si existe, es una referencia de negociación, no un mínimo vinculante, una venta automática ni una modificación de la cláusula.
- **system_offer_cycle:** No inmediatamente. La primera oferta se genera al siguiente cambio de ciclo de 00:00 Europe/Madrid por el 100 % del valor de mercado vigente entonces. Caduca al siguiente ciclo y, si el anuncio sigue activo, se renueva con el valor vigente. Una oferta activa por anuncio y ciclo.
- **private_offer_expiry:** 48 horas. Cada contraoferta reinicia el plazo de 48 horas. El anuncio En venta dura 72 horas.
- **instant_sale:** Paga el 80 % del valor de mercado autoritativo ahora; el quote debe reconfirmarse si cambia. Esperar a la oferta de Canastio permite cobrar el 100 % del valor vigente al generarla.
