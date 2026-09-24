# Historial de sesiones

## 2026-09-16 — #sprint-31-catalog-link-and-retired-games → review_pending
- Corregidos enlace estable de catálogo, deduplicación y partidos retirados; gates completos correctos. Pendiente de deploy y smoke productivo.

## 2026-09-16 — #sprint-30-railway-immediate-startup-sync → review_pending
- Implementación y gates completos en el commit `c31e2c6`; pendiente de smoke test humano en Railway.

## 2026-09-15T00:00:00.000+02:00 — #sprint-23-release-candidate Sprint 23 - Release Candidate → done
- Cierre confirmado explícitamente por el responsable del proyecto.
- Las validaciones operativas reales no ejecutadas permanecen documentadas como riesgo conocido; no se consideran evidencia superada.

## 2026-09-12T20:31:05.000+02:00 — #sprint-20-performance-reliability → review_pending
- Gate realistic ejecutado con 20 clientes concurrentes y 40 muestras por operación sobre PostgreSQL temporal aislado.
- P95 frío: home 180,88 ms; mercado 170,88 ms; ranking 51,43 ms. P95 caliente: 74,22/101,79/81,43 ms.
- Publicación completa: 583,81 ms; p95 interactivo máximo durante publicación: 118,79 ms; cero errores.
- Contenedor temporal eliminado tras guardar `progress/performance-report.json`.

## 2026-09-12T17:01:00.000+02:00 — #sprint-20-performance-reliability navegación interna optimizada
- La sesión Supabase se deduplica por request entre layout, páginas y servicios HTTP.
- Las pestañas principales se precargan y señalan de inmediato el destino pendiente; mercado solapa sus tres cargas pesadas.
- Typecheck, lint y 111 tests web pasan.

## 2026-09-12T16:53:00.000+02:00 — #sprint-20-performance-reliability Sprint 20 - Performance and Reliability → in_progress
- Caché privada e invalidación, índices, métricas, UI de revisión válida y gate realista implementados.
- Typecheck, lint, 111 tests web, 71 tests Python, ruff, Prisma validate, seed manifest y diff-check pasan.
- Pendiente el gate de rendimiento con PostgreSQL de integración; no hay `TEST_DATABASE_URL` ni Docker activo en el entorno local.

## 2026-09-12T12:00:00.000Z — #sprint-19-security-privacy-hardening Sprint 19 - Security and Privacy Hardening → done
- Revisión completada y cierre confirmado al solicitar el siguiente sprint.

## 2026-09-12T11:40:00.000Z — #sprint-18c-home-contextual-polish Sprint 18C - Home Contextual Polish → review_pending
- Implementación completada; gates automáticos aprobados y smoke test humano pendiente.


## 2026-09-04T21:56:32.075Z — #sprint-0-project-foundation Sprint 0 - Project Foundation → review_pending
- 3 intento(s) · agente codex

## 2026-09-05T23:30:42.786Z — #sprint-10-fantasy-team-roster Sprint 10 - Fantasy Team and Roster → review_pending
- 1 intento(s) · agente codex

## 2026-09-12T18:52:56.771Z — #sprint-21-accessibility-responsive-polish Sprint 21 - Accessibility and Responsive Polish → review_pending
- 1 intento(s) · agente codex

## 2026-09-13T23:06:40.196Z — #sprint-22-beta-observability Sprint 22 - Beta Observability → review_pending
- 1 intento(s) · agente codex

## 2026-09-13T23:43:50.856Z — #sprint-22b-ingestor-production-deployment Sprint 22B - Ingestor Production Deployment → review_pending
- 1 intento(s) · agente codex

## 2026-09-14T22:39:28.136Z — #sprint-24-production-1-0 Sprint 24 - Production 1.0 → review_pending
- 1 intento(s) · agente codex

## 2026-09-15T00:14:18.423Z — #sprint-25-production-push-notifications Sprint 25 - Production Push Notifications → review_pending
- 1 intento(s) · agente codex
## 2026-09-15T02:50:00.000Z — #sprint-26-push-outbox-railway-worker Sprint 26 - Push Outbox Railway Worker → review_pending
- 1 intento · outbox transaccional, worker Railway y wake-up autenticado; gates aprobados.

## 2026-09-15T13:41:00.000+02:00 — #sprint-27-social-league-experience Sprint 27 - Social League Experience → in_progress
- Primer corte: stream social, feed, reacciones, presencia, miembros, H2H de servicio, eventos de mercado/jornada y tarjeta SVG.
- Batería completa de gates aprobada; la feature permanece abierta porque varios criterios funcionales y pruebas específicas todavía no están completos.

## 2026-09-15T14:26:00.000+02:00 — transición Sprint 27 → Sprint 28
- Sprint 27 marcado `done` por confirmación explícita del responsable.
- Sprint 28 entrevistado y preparado hasta `spec_ready`; permanece `spec_approved: false` y sin implementación.

## 2026-09-15T12:58:32.342Z — #sprint-28-manager-profile-rivalries Sprint 28 - Manager Profile and Rivalries → review_pending
- 2 intento(s) · agente codex

## 2026-09-16T15:58:44.577Z — #sprint-29-monitored-competition-team-index Sprint 29 - Monitored Competition Team Index → review_pending
- 1 intento(s) · agente codex

## 2026-09-17T18:06:00.000Z — #sprint-35-recent-competition-catalog-order Sprint 35 - Recent Competition Catalog Order → review_pending
- 1 intento · catálogo ordenado por último cambio o descubrimiento; gates aprobados.

## 2026-09-24 — #sprint-37-fantasy-preseason-registrations → review_pending
- Spec revisada y aprobada por el usuario. Ingesta de fichas FAB, conciliación tentativa controlada, activación administrativa, cobertura de plantillas y pruebas completadas; smoke de Sevilla pendiente de publicación FAB.
