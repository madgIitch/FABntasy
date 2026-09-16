# sprint-33-preview-league-credentials · Compartir código y administrar contraseña desde la preview — Requisitos

- name: `Sprint 33 - Preview League Credentials` · priority: P1 · sdd: true
- aprobado por: peorr · 2026-09-16T17:51:06.462Z

## Contexto

Extender la pantalla de preview para que el propietario de una liga pueda consultar y copiar el código estable de su liga y cambiar su contraseña, sin abrir el resto del producto. La contraseña nunca se muestra ni se recupera: solo se sustituye mediante la operación server-side existente.

## Requisitos funcionales

R1. Un miembro ACTIVE ve el nombre y código estable CNST-XXXXXX de su liga y puede copiarlo; procede del servidor.
R2. Clipboard usa API nativa y fallback accesible ante fallo o ausencia.
R3. Solo el propietario ve y puede usar el cambio de contraseña; el hash permanece server-side y nunca se devuelve.
R4. Un miembro no propietario puede copiar el código pero no rotar credenciales.
R5. Las respuestas no contienen passwordHash, contraseña, tokens, cookies ni secretos y usan private, no-store.
R6. Varias ligas permanecen aisladas y la selección es determinista.
R7. La función opera en PREVIEW sin desbloquear el resto del producto.
R8. Tests unitarios, integración y E2E cubren autorización, aislamiento, Clipboard, rotación, ausencia de secretos, responsive y accesibilidad.

