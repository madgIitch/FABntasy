# Sprint 43 · Presupuesto inicial de 60 M

`spec_approved: true` — solicitud directa del usuario: «hay que reducir el salario de partida a 60M» (26/09/2026).

## Contrato

- Cada equipo Fantasy nuevo comienza con un presupuesto total de 60 000 000 créditos. Al adquirir una plantilla inicial, el saldo es 60 000 000 menos su coste.
- El límite de coste de la plantilla inicial es inclusivo: 60 000 000 es válido y 60 000 001 se rechaza.
- Los equipos existentes conservan el ruleset versionado, el presupuesto y el saldo con que se crearon; no se reescribe su historial económico.
- Las dos vías de creación de equipo, plantilla y mercado, usan el nuevo ruleset. Las lecturas y futuras validaciones de equipos existentes usan el ruleset asociado al equipo.

## Verificación

- Prueba unitaria del límite exacto y exceso de un crédito.
- Pruebas de creación de equipo nuevo y preservación de un equipo anterior.
- `typecheck`, `lint`, `test` y `diff-scope`.
