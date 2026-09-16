# sprint-32-controlled-rollout-preview · Preview de registro y ligas con acceso interno controlado — Diseño

## Scope (archivos que puede tocar)

- `apps/web/middleware.ts`
- `apps/web/app/auth/**`
- `apps/web/app/app/**`
- `apps/web/app/api/**`
- `apps/web/src/app/api/**`
- `apps/web/src/components/**`
- `apps/web/src/lib/supabase/**`
- `apps/web/src/server/**`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `supabase/**`
- `tests/**`
- `docs/SECURITY_PRIVACY.md`
- `docs/PRIVATE_LEAGUES.md`
- `docs/ARCHITECTURE.md`
- `docs/CONVENTIONS.md`
- `docs/DECISIONS.md`
- `spec/**`
- `progress/**`
- `.harness/**`
- `spec.json`

## Enfoque

- **data_model:** Configuración única PREVIEW/OPEN, versionada y auditable; bypass fijo por username canónico exacto.
- **external_contracts:** Se preservan Auth y ligas; contrato administrativo versionado sin nueva integración externa.
- **edge_cases:** Membresía sin bypass, coincidencias exactas, admin mínimo, rutas profundas, sesiones y concurrencia.
- **ui_states:** Preview dedicada, confirmaciones y estados accesibles; OPEN conserva la experiencia actual.

## Decisiones de la entrevista

- **data_model:** Persistir una única configuración vigente de rollout con estado PREVIEW u OPEN, versión para concurrencia, timestamps y referencia al último actor. Conservar los cambios en auditoría administrativa. El bypass no se modela como privilegio editable: queda limitado por este spec a los usernames normalizados exactos `pvto_pepe` y `fvcking_pepe`.
- **error_states:** Si la configuración falta o falla su lectura, producción se cierra de forma segura en PREVIEW. La pantalla pública conserva los errores de autenticación existentes; el onboarding distingue fallo de carga, ausencia de competiciones, errores de creación/unión y sesión caducada. Las APIs bloqueadas devuelven 403/ROLLOUT_PREVIEW y el control administrativo informa errores y conflictos sin modificar el valor mostrado como persistido.
- **edge_cases:** Haber creado una liga o pertenecer a ella no elimina el bloqueo. Las coincidencias de bypass son exactas sobre el username canónico server-side. Un admin no exceptuado solo accede al control mínimo de rollout. Se contemplan rutas profundas, callbacks, múltiples pestañas, cambio de estado durante una sesión y escrituras administrativas concurrentes.
- **auth_secrets:** La protección se aplica server-side a páginas, Server Actions y APIs. Nunca se confía en email, displayName, query params, headers ni cookies aportadas por el cliente para el bypass. Cambiar el gate exige sesión, grant INGESTION_ADMIN, origen válido, confirmación y auditoría; no se exponen allowlist, secretos, tokens, cookies ni PII innecesaria.
- **external_contracts:** Se preservan Supabase Auth y los contratos existentes de creación/unión de ligas. La nueva superficie administrativa permite leer el estado vigente y cambiar PREVIEW ↔ OPEN con control de versión o serialización, respuesta del valor persistido y error estable de conflicto. No introduce servicios externos.
- **ui_states:** En PREVIEW, una cuenta normal ve una experiencia dedicada de acceso anticipado con crear liga, unirse, confirmación y cierre de sesión, sin shell ni navegación del producto. Incluye carga, éxito, error, sesión caducada, cero competiciones y usuario ya inscrito, con soporte responsive y accesible. OPEN restaura el flujo previo sin una pantalla intermedia.
- **rollback_compat:** La migración es aditiva. Cambiar de OPEN a PREVIEW o revertir la aplicación no borra cuentas, ligas, membresías, equipos ni actividad. Si el código nuevo se retira, la tabla/configuración adicional puede permanecer sin afectar los contratos anteriores.
- **tests:** Unitarios para la decisión central y matching de usernames; integración PostgreSQL para persistencia, auditoría y concurrencia; tests HTTP para páginas, APIs y mutaciones; E2E para registro/login, creación/unión, bloqueo, bypass, control admin, responsive y accesibilidad. Sin Supabase real ni red FAB en la suite determinista.

