# sprint-13-market-transactions · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Decisiones de la entrevista

- **data_model:** Propiedad exclusiva por jugador y liga; ledger inmutable, transacciones históricas, inversiones de cláusula y protecciones con jornada y caducidad. El saldo inicial deriva del presupuesto menos el coste de la plantilla inicial.
- **market_rules:** Los libres se compran al valor global vigente y se venden a ese mismo valor. La cláusula es 1,75 × max(precio pagado, valor vigente), más la inversión del propietario a razón de +2 créditos de cláusula por cada crédito gastado. La inversión no se devuelve y se reinicia con el cambio de propietario.
- **protections:** Un blindaje de 24 horas por usuario y jornada; protección de nuevos fichajes hasta la siguiente jornada; máximo un clausulazo realizado y recibido por usuario y jornada; tras recibirlo se protege el resto de la plantilla hasta la siguiente jornada. Los clausulazos cierran 24 horas antes del primer partido autoritativo y durante la jornada.

