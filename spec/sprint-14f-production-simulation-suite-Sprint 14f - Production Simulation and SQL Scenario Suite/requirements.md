# sprint-14f-production-simulation-suite · Sprint 14F - Simulación productiva y suite de escenarios SQL — Requisitos

- name: `Sprint 14f - Production Simulation and SQL Scenario Suite` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-09T00:07:01.071Z

## Contexto

Spec detallada: docs/testing/SPRINT_14F_SPEC.md. Separa foundation, escenarios, transiciones, operaciones reales, assertions, diagnóstico, evidencia y teardown, integrándolos en el ciclo del harness.

## Requisitos funcionales

R1. Existe una arquitectura separada para foundation, scenarios, transitions, assertions, diagnostics y teardown, accesible mediante un runner único.
R2. Todo run requiere scenario, run_id, seed, clock y profile; repetir parámetros produce resultados de dominio equivalentes y reproducibles.
R3. El runner rechaza bases no marcadas como test y el teardown demuestra que solo elimina datos atribuibles al run seleccionado.
R4. Los perfiles small y realistic cumplen sus volúmenes; realistic crea 12 equipos reales, al menos 120 jugadores, 20 managers y una temporada navegable.
R5. Las estadísticas sintéticas mantienen coherencia de minutos, tiros, marcador y estados DNP, ausente, aplazado, parcial, final y corregido.
R6. Se implementan los 15 escenarios canónicos descritos en docs/testing/SPRINT_14F_SPEC.md y el ciclo puede detenerse o reanudarse por checkpoint.
R7. Las operaciones con reglas o concurrencia pasan por servicios/API reales; SQL directo se limita a precondiciones, fixtures deportivos, assertions y diagnóstico.
R8. Las assertions económicas detectan automáticamente divergencias entre presupuesto, ledger, saldo, adquisiciones, precios y cláusulas.
R9. Las assertions de ownership, roster, lineup, scoring, ranking, precios, permisos e aislamiento pasan después de cada transición crítica.
R10. Los rechazos mínimos y las seis carreras concurrentes terminan sin propiedad doble, ledger parcial, duplicidad idempotente o publicación incoherente.
R11. La vertical T0-T11 produce actividad a partir de acciones reales y estados navegables de onboarding, Mercado, Mi equipo, Jornada, Liga y Perfil.
R12. Una corrección de boxscore conserva revisiones auditables, supersede resultados y recalcula totales, posiciones y precios sin duplicados.
R13. Setup, transiciones y teardown son reejecutables; keep_on_fail controla la conservación de un run fallido y su diagnóstico permanece acotado.
R14. El harness incorpora seed-manifest-validate, seed-small-smoke, seed-idempotency, seed-assertions, seed-realistic-cycle y seed-teardown-isolation sin retirar gates existentes.
R15. Los tests funcionan sin llamadas reales a FAB y la evidencia no contiene secretos, PII ni dumps completos.
R16. Los seeds anteriores disponen de compatibilidad durante la migración y el rollback no requiere mutaciones destructivas.
R17. Typecheck, lint, tests web, pytest, ruff, Prisma validate, gates de datos y diff-scope pasan en una base de integración limpia.
R18. La documentación cubre catálogo, parámetros, comandos, tiempos esperados, diagnóstico, matriz de cobertura y límites frente a producción.

