# sprint-16-pwa-install-and-notifications · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `prisma/**`
- `packages/domain/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `pnpm-lock.yaml`
- `spec.json`

## Enfoque

- **data_model:** Añade suscripciones Web Push, preferencias por intención y entregas auditables/deduplicadas, siempre vinculadas al usuario.
- **external_contracts:** Usa estándares Manifest, Service Worker, Push API y Notifications API; el proveedor Web Push queda detrás de un adaptador sustituible.
- **edge_cases:** Cubre varias suscripciones por usuario, rotación de endpoint, logout, revocación del navegador, reinstalación, duplicados de jornada y cutoff vencido.
- **ui_states:** Instalación y notificaciones se gestionan desde Perfil con copy específico por plataforma y sin bloquear la app cuando no hay soporte.

## Decisiones de la entrevista

- **product_boundary:** El sprint completa la instalación y el canal Web Push opt-in. No introduce mensajería interna, campañas, email, SMS ni un scheduler de producción nuevo; expone un dispatcher idempotente invocable por el orquestador futuro y cubierto mediante harness local.
- **permission_model:** El permiso solo se solicita tras una acción explícita en Perfil > Notificaciones. Activar una intención con permiso `default` inicia el flujo; `denied` muestra instrucciones de recuperación y nunca aparenta que la intención está activa.
- **notification_taxonomy:** Las preferencias persistidas son independientes: `MARKET_PRICE`, `MARKET_OFFER`, `MARKET_OUTBID`, `MARKET_SOLD`, `TEAM_CUTOFF`, `TEAM_LINEUP`, `LEAGUE_CLAUSE`, `LEAGUE_ACTIVITY`, `LEAGUE_MESSAGE`, `ROUND_START` y `ROUND_RESULT`. La UI las agrupa en Mercado, Mi equipo, Liga y Jornada. No existe una intención de lesiones porque FAB no proporciona esa señal.
- **delivery_semantics:** Cada entrega usa una clave idempotente estable formada por usuario, intención y evento de dominio. Las suscripciones expiradas o rechazadas con 404/410 se revocan; los fallos transitorios quedan registrados para reintento acotado. Ningún aviso de cutoff se crea después del cierre y todos los cálculos temporales usan `Europe/Madrid`.
