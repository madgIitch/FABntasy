# Congelación de algoritmos 1.0

Vigente desde 2026-09-15 para el inicio de competición:

- scoring provincial y nacional: `canastio.*.player-game@1.0.0`, fuente `packages/domain/fantasy-scoring/rulesets.ts`, SHA-256 `dd497e4b128ef4227022a359c0c35344fc0332f58879834d8c5b775589d03261`;
- precios: `canastio-market-v1`, fuente `packages/domain/player-pricing/index.ts`, SHA-256 `c65563e0c6eb2995959db4900f10e7a85fc1877d836db20672f85c29d49bc492`.

El contenido de esas fuentes es la configuración canónica (fórmulas, muestra, normalización, redondeo, curva, límites y ajustes DNP). El release verifica los hashes sobre el mismo commit promovido. Tras la fecha efectiva no se edita una versión activa: se añade una versión nueva, se registra decisión, migración aditiva si procede, ventana efectiva y actor; se recomputa explícitamente por `competition_season_id` conservando inputs, versión anterior, revisiones publicadas y auditoría. Activación y rollback son eventos auditables; nunca se reescribe historia.

