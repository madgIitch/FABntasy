# Puntuación por jornada y rankings

La puntuación de un equipo se calcula exclusivamente con los cinco titulares de la alineación congelada. Los suplentes no puntúan ni sustituyen automáticamente. Un titular `DNP` aporta cero; cualquier score pendiente, erróneo o no calculable mantiene el resultado provisional.

Los resultados se versionan mediante `input_revision`. Una corrección crea una revisión nueva, conserva la anterior y actualiza de forma atómica los acumulados. Solo la última revisión publicada de cada jornada cuenta para el total.

El orden de clasificación es: puntos acumulados, puntos de la última jornada, mejor puntuación individual de jornada, antigüedad del equipo e identificador estable. El endpoint `GET /api/fantasy/rankings` requiere `competitionSeasonId` y admite `leagueId` y `roundNumber`; los rankings privados requieren membresía activa.

La variable server-side `FANTASY_ROUND_SCORING_ENABLED=false` impide recomputaciones, pero no las lecturas históricas.
