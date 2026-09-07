# sprint-14b-live-round-experience · undefined — Requisitos

- name: `Sprint 14b - Live Round Experience` · priority: - · sdd: true
- aprobado por: peorr · 2026-09-07T02:15:39.328Z

## Contexto



## Requisitos funcionales

R1. La vista usa únicamente datos reales del usuario, su alineación congelada y los resultados versionados del Sprint 14; no muestra ejemplos como si fueran datos reales.
R2. El total de jornada y el desglose contienen exclusivamente los cinco titulares; los suplentes no aparecen como contribuciones puntuables.
R3. Cada titular muestra nombre, puntos fantasy, estadísticas disponibles y un estado inequívoco: por jugar, jugando, finalizado, DNP o pendiente de cálculo.
R4. La cabecera distingue visual y textualmente jornada próxima, en directo, provisional y finalizada sin depender solo del color.
R5. La evolución acumulada se representa con un gráfico pequeño y accesible que conserva una alternativa textual.
R6. El usuario puede consultar jornadas recientes sin perder el contexto de liga y competición.
R7. Los estados loading, vacío, error y offline son accionables y nunca sustituyen datos ausentes por ceros engañosos.
R8. La interfaz funciona sin scroll horizontal desde 320 px, mantiene la navegación inferior visible y ofrece objetivos táctiles de al menos 44 px.
R9. Los datos en directo se refrescan de forma acotada, se detienen cuando la pestaña no está visible y no duplican peticiones concurrentes.
R10. Tests de componentes, contratos y E2E cubren los estados de jornada, el quinteto, el gráfico, navegación entre jornadas y responsive móvil.

## Restricciones

- **error_states:** Define previo, en directo, provisional, finalizado, vacío, error y offline.
- **auth_secrets:** La identidad procede de sesión y solo consulta el equipo del usuario y ligas autorizadas.
- **rollback_compat:** Ruta y componentes aditivos; la pestaña conserva un estado vacío si se desactiva el cálculo.

