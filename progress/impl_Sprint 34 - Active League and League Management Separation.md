# Implementación · Sprint 34 - Active League and League Management Separation

## Resultado

- La pestaña Liga queda dedicada a clasificación, actividad, miembros e invitación de la liga activa.
- Perfil → Mis ligas lista membresías, permite seleccionar la activa y abandonar cuando el actor no es propietario.
- Crear liga y Unirme con código usan rutas y formularios dedicados.
- `user_profiles.active_league_id` conserva la preferencia de forma aditiva; el servidor valida membresía ACTIVE y repara selecciones obsoletas con fallback determinista.
- El perfil muestra `Sin puntos todavía` en lugar de un guion ambiguo.
- PREVIEW conserva el onboarding existente.

## Verificación

- `corepack pnpm typecheck`: OK.
- `corepack pnpm lint`: OK, tres warnings heredados de `img` sin errores.
- `corepack pnpm test`: OK, 45 archivos y 180 tests.
- `corepack pnpm exec prisma validate`: OK.
- `diff-scope`: OK.
- `corepack pnpm --filter @fabntasy/web test:e2e`: 12 passed, 42 skipped por fixtures autenticados ausentes.
- Servidor local y portada: cargan sin overlay de Next.js.
- Suite visual heredada: bloqueada en el fixture `admin` por `Cannot read properties of undefined (reading 'filter')`, fuera del cambio.

## Pendiente de revisión

- Aplicar la migración `20260917180000_active_league_selection` en el entorno correspondiente.
- Smoke autenticado a 393×852: Perfil → Mis ligas, activar liga, crear, unirse, abandonar y comprobar Liga.
