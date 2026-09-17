# sprint-34-active-league-management-separation · Separación entre liga activa y gestión de ligas — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [x] (T1) La pestaña Liga no contiene formularios para crear otra liga ni unirse a otra; muestra únicamente la liga activa, sus tabs y acciones contextuales autorizadas.  ↔ R1
- [x] (T2) Perfil > Mis ligas lista todas las membresías ACTIVE con nombre, competición, equipo, número de managers y navegación inequívoca.  ↔ R2
- [x] (T3) El usuario puede elegir la liga activa; el servidor verifica la membresía, persiste una selección válida y aplica un fallback determinista si esa membresía deja de estar ACTIVE.  ↔ R3
- [x] (T4) La acción Añadir ofrece opciones separadas para Crear liga y Unirme con código; cada opción abre un formulario dedicado con validación, carga, éxito, error y restauración de foco.  ↔ R4
- [x] (T5) Crear, unirse o abandonar conserva autorización, aislamiento, límites, idempotencia y reglas vigentes de propietario; ninguna selección cliente concede acceso.  ↔ R5
- [x] (T6) Liga mantiene clasificación, actividad, miembros e invitación de la liga activa; la administración contextual solo aparece para actores autorizados.  ↔ R6
- [x] (T7) El perfil representa la ausencia de puntuación como `Sin puntos todavía` o elimina la métrica, sin mostrar un guion ambiguo.  ↔ R7
- [x] (T8) PREVIEW conserva su experiencia limitada para preparar ligas y OPEN utiliza la nueva separación; ninguna ruta o API bloqueada queda accesible por el rediseño.  ↔ R8
- [x] (T9) El rollback de aplicación no elimina ligas, membresías, equipos, credenciales, actividad ni la capacidad de acceder con versiones anteriores.  ↔ R9
- [ ] (T10) Tests unitarios, integración y E2E cubren cero, una y varias ligas, selección y fallback, creación, unión, abandono, permisos, errores, PREVIEW/OPEN, teclado, lector de pantalla y 320, 375, 768, 1024 y 1440 px.  ↔ R10
- [ ] Tests que cubran los criterios de aceptación
