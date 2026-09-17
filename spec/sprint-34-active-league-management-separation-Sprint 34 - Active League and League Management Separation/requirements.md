# sprint-34-active-league-management-separation · Separación entre liga activa y gestión de ligas — Requisitos

- name: `Sprint 34 - Active League and League Management Separation` · priority: P1 · sdd: true
- aprobado por: peorr · 2026-09-17T15:56:53.368Z

## Contexto

Separar la experiencia competitiva de la liga activa de la gestión de membresías: la pestaña Liga conserva clasificación, actividad, miembros e invitación, mientras Perfil > Mis ligas concentra selección, creación, unión y abandono.

## Requisitos funcionales

R1. La pestaña Liga no contiene formularios para crear otra liga ni unirse a otra; muestra únicamente la liga activa, sus tabs y acciones contextuales autorizadas.
R2. Perfil > Mis ligas lista todas las membresías ACTIVE con nombre, competición, equipo, número de managers y navegación inequívoca.
R3. El usuario puede elegir la liga activa; el servidor verifica la membresía, persiste una selección válida y aplica un fallback determinista si esa membresía deja de estar ACTIVE.
R4. La acción Añadir ofrece opciones separadas para Crear liga y Unirme con código; cada opción abre un formulario dedicado con validación, carga, éxito, error y restauración de foco.
R5. Crear, unirse o abandonar conserva autorización, aislamiento, límites, idempotencia y reglas vigentes de propietario; ninguna selección cliente concede acceso.
R6. Liga mantiene clasificación, actividad, miembros e invitación de la liga activa; la administración contextual solo aparece para actores autorizados.
R7. El perfil representa la ausencia de puntuación como `Sin puntos todavía` o elimina la métrica, sin mostrar un guion ambiguo.
R8. PREVIEW conserva su experiencia limitada para preparar ligas y OPEN utiliza la nueva separación; ninguna ruta o API bloqueada queda accesible por el rediseño.
R9. El rollback de aplicación no elimina ligas, membresías, equipos, credenciales, actividad ni la capacidad de acceder con versiones anteriores.
R10. Tests unitarios, integración y E2E cubren cero, una y varias ligas, selección y fallback, creación, unión, abandono, permisos, errores, PREVIEW/OPEN, teclado, lector de pantalla y 320, 375, 768, 1024 y 1440 px.

## Restricciones

- **error_states:** Exige validación y feedback accesible, pero no concreta estados, códigos ni recuperación ante conflictos.
- **auth_secrets:** La identidad debe resolverse desde Supabase Auth en servidor; se conservan autorización, aislamiento, hash scrypt de contraseñas y ausencia de secretos o identidad confiada al cliente.
- **rollback_compat:** Se exige conservar contratos existentes, pero no se especifica una migración aditiva ni el comportamiento de clientes o datos anteriores durante despliegue y rollback.

