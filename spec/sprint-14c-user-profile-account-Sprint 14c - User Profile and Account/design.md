# sprint-14c-user-profile-account · Sprint 14c - User Profile and Account — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** Amplía `UserProfile` con username normalizado y avatar opcional; conserva `displayName`, la identidad externa de Supabase y todas las relaciones fantasy existentes.
- **external_contracts:** Usa Supabase Auth para correo/sesión, Supabase Storage para avatar y servicios internos autorizados para perfil, métricas y ligas.
- **edge_cases:** Define fallback de avatar, registro atómico, alta retrocompatible para usuarios existentes, concurrencia de username, métricas pendientes y separación entre múltiples identidades de equipo.
- **ui_states:** Define avatar persistente, perfil, edición, cuenta básica, listado de ligas, confirmación de logout, responsive, teclado y estados vacíos/error.

## Decisiones de la entrevista

- **product_cut:** 14C implementa identidad global, perfil editable, resumen fantasy real, acceso a ligas, cuenta básica y cierre de sesión confirmado. Notificaciones quedan en Sprint 16; sesiones activas, 2FA, privacidad, exportación y borrado en Sprint 19; tema, idioma y formato numérico en Sprint 21.
- **navigation:** Perfil no es una sexta pestaña inferior. El avatar permanece en la cabecera autenticada y abre `/app/perfil`; la navegación principal conserva Inicio, Mercado, Mi equipo, Jornada y Liga.
- **identity_boundaries:** El username y el nombre visible pertenecen a la cuenta global. El username es obligatorio al crear una cuenta nueva. El nombre y escudo del equipo pertenecen a cada liga y no se modifican al editar el perfil.
