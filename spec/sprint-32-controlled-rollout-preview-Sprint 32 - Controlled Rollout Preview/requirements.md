# sprint-32-controlled-rollout-preview · Preview de registro y ligas con acceso interno controlado — Requisitos

- name: `Sprint 32 - Controlled Rollout Preview` · priority: P0 · sdd: true
- aprobado por: peorr · 2026-09-16T17:27:14.667Z

## Contexto

Introducir un gate de rollout administrable que, mientras esté activo, permita al público registrarse, iniciar sesión y crear o unirse a una liga como preview, pero bloquee el resto del producto. Los perfiles `pvto_pepe` y `fvcking_pepe` conservan acceso integral para pruebas internas. Un administrador puede activar o desactivar el gate en tiempo de ejecución de forma segura y auditable.

## Requisitos funcionales

R1. El estado de rollout tiene dos valores observables, PREVIEW y OPEN, se persiste server-side como una única configuración vigente y se evalúa en cada petición protegida; si la configuración falta o no puede leerse, producción aplica PREVIEW de forma segura y muestra un error recuperable en el control administrativo.
R2. En PREVIEW permanecen públicas la portada, registro, confirmación y callback de correo, login, recuperación y actualización de contraseña, manifest y recursos estáticos necesarios; ninguna de estas superficies revela si un correo ajeno existe ni expone secretos o configuración interna.
R3. Una cuenta autenticada no exceptuada puede acceder únicamente a la pantalla de preview y a las operaciones necesarias para consultar competiciones fantasy habilitadas, crear una liga o unirse a una liga; no recibe el shell, la navegación ni datos del resto del producto.
R4. Crear o unirse a una liga durante PREVIEW conserva exactamente las validaciones, autorización, aislamiento, límites e idempotencia existentes. Al completarse, el usuario permanece en la preview y ve una confirmación de que su liga está preparada para la apertura; pertenecer ya a una liga no concede acceso adicional.
R5. En PREVIEW, toda navegación directa de una cuenta no exceptuada a páginas privadas fuera de la preview redirige a la URL canónica de preview, sin bucles y sin conservar destinos no permitidos; las rutas administrativas no se usan como vía de acceso al producto.
R6. En PREVIEW, toda API, Server Action o mutación de producto fuera de la allowlist de autenticación y onboarding de liga rechaza a cuentas no exceptuadas con HTTP 403 y código estable ROLLOUT_PREVIEW, sin ejecutar lógica de negocio ni filtrar datos; una sesión ausente conserva el comportamiento 401 o redirección de autenticación vigente.
R7. Solo los perfiles cuyo username normalizado coincida exactamente con `pvto_pepe` o `fvcking_pepe` omiten el gate y conservan todas las páginas y APIs que ya les autorice su sesión; email, displayName, mayúsculas originales, parámetros, cabeceras o cookies suministradas por el cliente no pueden otorgar la excepción.
R8. Un usuario con grant activo INGESTION_ADMIN puede consultar y cambiar PREVIEW ↔ OPEN desde el área administrativa aun cuando PREVIEW esté activo. La mutación exige sesión, grant, origen válido y confirmación explícita, y registra actor, valor anterior, valor nuevo, timestamp y resultado sin almacenar tokens, cookies ni PII innecesaria.
R9. Un administrador no incluido en la allowlist solo obtiene durante PREVIEW el acceso mínimo a la superficie que permite consultar y cambiar el rollout y cerrar sesión; el grant administrativo por sí solo no habilita las páginas o APIs normales del producto.
R10. Cada cambio administrativo entra en vigor para peticiones nuevas sin redeploy. Dos cambios concurrentes se serializan o usan control de versión para que no haya actualizaciones perdidas; la respuesta devuelve el estado finalmente persistido y un conflicto tiene código estable.
R11. En OPEN, el gate deja de restringir navegación, renderizado y APIs para todas las cuentas, y los contratos de autorización, onboarding y membresía previos siguen siendo la única fuente de permisos; volver a PREVIEW no borra cuentas, ligas, membresías, equipos ni actividad ya creada.
R12. La pantalla de preview explica el acceso anticipado, ofrece crear o unirse a una liga, representa carga, éxito, error, sesión caducada, sin competiciones disponibles y estado ya inscrito, permite cerrar sesión y funciona con teclado y lector de pantalla a 320, 375, 768, 1024 y 1440 px sin scroll horizontal involuntario.
R13. Las respuestas privadas y la decisión de bypass usan datos server-side actuales, envían cabeceras que evitan cachear contenido entre usuarios y no incluyen la allowlist, secretos, correos, UUID internos ni la configuración administrativa completa en HTML, JavaScript cliente, logs o respuestas públicas.
R14. Tests unitarios, integración PostgreSQL y E2E cubren PREVIEW y OPEN, configuración ausente y error de lectura, usuario anónimo, usuario normal antes y después de crear o unirse, ambos usernames exceptuados, homónimos y coincidencias parciales, admin no exceptuado, rutas profundas, APIs GET y mutaciones, cambio concurrente, sesión caducada, accesibilidad y responsive; typecheck, lint, test, Prisma validate y diff-scope terminan con código cero.

## Restricciones

- **error_states:** Fail-closed en PREVIEW, 403/ROLLOUT_PREVIEW y estados recuperables de UI y administración.
- **auth_secrets:** Decisión server-side, origen y grant para mutaciones, sin confiar en identidad aportada por cliente.
- **rollback_compat:** Cambio aditivo y reversible sin borrar datos de usuario o fantasy.

