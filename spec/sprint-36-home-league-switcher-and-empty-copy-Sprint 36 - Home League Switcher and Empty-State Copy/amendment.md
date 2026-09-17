# Sprint 36 — Ampliación visual pendiente de aprobación

Esta ampliación pertenece a Sprint 36, no crea una feature nueva. La entrega anterior y sus commits permanecen intactos. `spec.json` contiene los criterios ampliados; la aprobación anterior no autoriza automáticamente esta revisión.

## Diseño

- Tesis visual: contexto de liga editorial, tipografía clara y un solo lenguaje de iconos lineales, sin apariencia de formulario.
- Contenido: competición → selector de liga → recuento/Invitar autorizado → tabs → clasificación o estado vacío compacto.
- Interacción: un componente compartido entre las cinco superficies, chevron que refleja apertura, foco restaurado y anuncio de éxito tras representar datos confirmados. Movimiento breve y respetuoso de reduced-motion.
- Reutilizar la selección persistida y autorización actuales, sin migraciones ni nuevos contratos. Con cero ligas permanece onboarding; con una se conserva acceso a gestión; seleccionar la activa no muta.
- Red/5xx conserva contexto anterior; rechazo de membresía exige reconciliar con fallback del servidor. Un fallo de transporte incierto se reconcilia antes de anunciar éxito; no se revierte ciegamente una selección persistida.
- Invitar reutiliza el flujo autorizado existente y no provoca generación o rotación al cargar la pantalla.

## Scope adicional

- `apps/web/src/components/**`: extracción y reutilización del selector y refinamientos de Liga, únicamente los componentes afectados por estos criterios.
- `apps/web/app/app/**`: suministrar opciones y contexto autorizado a las cinco superficies.
- `apps/web/e2e/**`: pruebas del flujo compartido y fixtures.

## Tareas de ampliación

- [ ] Extraer el selector único y usarlo en Inicio/Mercado/Mi equipo/Jornada/Liga.
- [ ] Confirmación accesible de cambio sin mezclar datos ni ampliar permisos.
- [ ] Sustituir select nativo y acción duplicada Ver miembros.
- [ ] Invitar autorizado, tabs sin scrollbar innecesaria y vacío de altura natural.
- [ ] Conservar avatar, clasificación con datos y gestión completa en Perfil.
- [ ] Verificar errores, teclado/foco, permisos y breakpoints; documentar tests omitidos.
- [ ] Gates completos y smoke visual antes de volver a review_pending.
