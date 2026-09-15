# Sesión actual

Feature: **sprint-27-social-league-experience · Sprint 27 - Social League Experience** — estado: `in_progress`.

- agente: codex
- rama: `main`
- spec aprobado: sí

## Implementado en el primer corte

- Stream social versionado e idempotente, persistencia Prisma, migración y políticas RLS.
- Eventos transaccionales para mercado, altas de miembros y publicación de jornadas.
- Actividad de liga con reacciones cerradas, cursor, estados degradados y clausulazos destacados.
- Vista Miembros con estadísticas publicadas y presencia anónima efímera.
- API Head-to-Head, reglas deterministas de rivalidad, campeón de jornada auditable y seguimiento básico de jugadores.
- Tarjeta SVG descargable para eventos autorizados.
- Todos los gates configurados pasan, incluidas 165 pruebas web, E2E, seeds, Python, Ruff, Prisma y diff-scope.

## Siguiente acción

- Completar los criterios aún abiertos: perfil completo y UI Head-to-Head/rivalidades; catálogo completo de logros; experiencia de jornada en directo; alertas Push para jugadores seguidos; tarjetas públicas por tipo/Web Share; backfill y pruebas PostgreSQL/RLS, concurrencia, carga y E2E específicas.
