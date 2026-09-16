# sprint-33-preview-league-credentials · Compartir código y administrar contraseña desde la preview — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) Un miembro ACTIVE ve el nombre y código estable CNST-XXXXXX de su liga y puede copiarlo; procede del servidor.  ↔ R1
- [ ] (T2) Clipboard usa API nativa y fallback accesible ante fallo o ausencia.  ↔ R2
- [ ] (T3) Solo el propietario ve y puede usar el cambio de contraseña; el hash permanece server-side y nunca se devuelve.  ↔ R3
- [ ] (T4) Un miembro no propietario puede copiar el código pero no rotar credenciales.  ↔ R4
- [ ] (T5) Las respuestas no contienen passwordHash, contraseña, tokens, cookies ni secretos y usan private, no-store.  ↔ R5
- [ ] (T6) Varias ligas permanecen aisladas y la selección es determinista.  ↔ R6
- [ ] (T7) La función opera en PREVIEW sin desbloquear el resto del producto.  ↔ R7
- [ ] (T8) Tests unitarios, integración y E2E cubren autorización, aislamiento, Clipboard, rotación, ausencia de secretos, responsive y accesibilidad.  ↔ R8
- [ ] Tests que cubran los criterios de aceptación
