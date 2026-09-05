# sprint-9-fantasy-scoring-engine · undefined — Diseño

## Scope (archivos que puede tocar)

- `packages/domain/**`
- `prisma/**`
- `apps/web/src/server/**`
- `apps/web/src/app/**`
- `apps/web/src/components/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** FantasyScoringRuleSet es inmutable, versionado y asociado como mínimo a competitionSeason y tipo de cálculo. Sus parámetros declarativos incluyen fórmula, coeficientes, estadísticas requeridas, normalización, muestra mínima, límites, DNP, bonus y redondeo. FantasyPlayerGameScore referencia PlayerGameStat, jugador, partido, ruleset y source_stats_version; persiste raw_score y normalized_score nullable, estado, código estable, breakdown JSON y timestamps. source_stats_version es el SHA-256 del snapshot canónico y existe unicidad por (player_game_stat_id, ruleset_id, source_stats_version). Las identidades dudosas no se fusionan entre temporadas.
- **external_contracts:** El contrato server-side documenta tipos y nullabilidad para status, errorCode nullable, playerId, gameId, competitionId, competitionSeasonId, rawScore nullable, normalizedFantasyPoints nullable, rulesetId, rulesetVersion, sourceStatsVersion y breakdown. El breakdown mantiene orden canónico según el orden de términos declarado por el ruleset y contiene rawTerms, normalization y finalScore; cada término conserva estadística o expresión, valor original nullable, coeficiente o condición, contribución Decimal sin redondear y valor presentado cuando corresponda. El score se obtiene de la suma Decimal sin redondear y se redondea únicamente al final, no sumando contribuciones ya redondeadas. Las respuestas no calculables o pendientes usan status y errorCode estables con scores null. La versión activa o solicitada siempre es explícita y las versiones nuevas son aditivas.
- **edge_cases:** El ruleset v1 queda definido y explícitamente calibrable. Provincial: RawProv = PTS + 0.50×3PM + 0.25×FTM - 0.50×FC; 2PM no se suma porque ya está contenido en PTS. Nacional: RawNac = PTS + 1.20×REB + 1.50×AST + 3.00×STL + 3.00×BLK - 1.50×TO - 0.50×(FGA-FGM) - 0.50×(FTA-FTM) - 0.50×FC. v1 no aplica bonus y permite raw negativos. La población de normalización contiene las actuaciones calculables, no-DNP, de la misma competitionSeason y jornada. Usa media y desviación estándar poblacional: Z=(raw-media)/desviación y FP=clamp(20+10×Z,0,50). Requiere al menos 20 actuaciones y desviación mayor que cero. Los empates de raw reciben el mismo Z y FP. DNP exige minutos=0 y todas las estadísticas presentes=0, produce 0 FP y queda fuera de la población. Se usa Decimal sin redondeos intermedios; raw y FP se redondean al final a una decimal mediante half-up. Los parámetros se conservan dentro de cada versión y toda recalibración crea una versión nueva.
- **ui_states:** La ficha de jugador y el boxscore muestran los FP normalizados como cifra principal y un desglose expandible con fórmula, términos brutos, población de referencia, posición relativa y transformación final. Identifican competición, temporada y versión; distinguen mediante texto calculado, DNP, pendiente por muestra, datos incompletos, error y recalculado. No convierten ausencias en cero y funcionan desde 320 px sin scroll horizontal involuntario.

## Decisiones de la entrevista

- **adv-a32f4d46dd:** ### [adv-dfb4132ffe] No se define el esquema del snapshot canónico: campos incluidos, tipos/unidades, cuáles son obligatorios u opcionales y cómo se obtiene el identificador inmutable source_stats_version.

**R:**
- **adv-1cbf7a4301:** ### [adv-dc73212a2b] No se define qué constituye DNP ni su resultado observable: score cero, ausencia de resultado o estado específico.

**R:**
- **adv-7fb6c17400:** ### [adv-f55e6cd938] No se concreta la política de redondeo: precisión, modo de desempate, si se redondea cada término o solo la suma y representación decimal serializada.

**R:**
- **adv-4e32ac2414:** ### [adv-2bac99ef7f] No se enumeran los estados persistidos/devueltos ni los códigos estables, ni se define qué valor debe tener score cuando el cálculo no es posible.

**R:**
- **adv-40b82b5fc7:** ### [adv-0e76b11f65] No se define la unidad transaccional de una recomputación: un jugador, un partido, una jornada o todo el lote solicitado.

**R:**
- **adv-ebf0f04d69:** ### [adv-ca07953900] No se define qué significa observablemente «recalculado», cuándo se asigna ese estado y si sustituye o complementa el estado calculado.

**R:**
- **adv-bc06a8dab2:** ### [adv-8be907219b] No se decide el comportamiento cuando una consulta omite la versión pese a exigir que la versión consultada o activa sea explícita: rechazo, uso de la activa o inclusión de todas.

**R:**
- **adv-23884c3bca:** ### [adv-b7ae7ba922] No se indican las rutas/pantallas donde debe mostrarse el score y la fórmula ni el texto exacto o mapeo inequívoco para distinguir calculado, datos desconocidos, pendiente, error y recalculado.

**R:**
- **adv-d8a18906d4:** ## Decisiones registradas
- **edge_cases:** Ruleset v1 estimado y explícitamente calibrable. Provincial: RawProv = PTS + 0.50×3PM + 0.25×FTM - 0.50×FC. Las canastas de 2 ya están contenidas en PTS y no se duplican. Nacional: RawNac = PTS + 1.20×REB + 1.50×AST + 3.00×STL + 3.00×BLK - 1.50×TO - 0.50×(FGA-FGM) - 0.50×(FTA-FTM) - 0.50×FC. v1 no aplica bonus. Los raw pueden ser negativos. La normalización usa las actuaciones elegibles de la misma competitionSeason y jornada: Z=(raw-media)/desviación estándar poblacional y FP=clamp(20+10×Z, 0, 50). Exige al menos 20 actuaciones no-DNP y desviación > 0; hasta entonces queda PENDING/INSUFFICIENT_NORMALIZATION_SAMPLE. DNP significa minutos igual a 0 y todas las estadísticas presentes igual a 0: produce 0 FP y no entra en la población. Un null requerido produce NOT_CALCULABLE; un campo no usado por el ruleset puede ser null. Cálculos internos con Decimal, sin redondeos intermedios; raw y FP se redondean al final a una decimal con half-up. Los parámetros viven en el ruleset versionado para poder recalibrarlos tras seedings sin alterar resultados históricos.
- **tests:** Casos dorados v1: Provincial PTS=20, 3PM=2, FTM=4, FC=3 da raw=20.5; Nacional PTS=20, REB=8, AST=5, STL=2, BLK=1, TO=3, FGM=7, FGA=15, FTM=4, FTA=6 y FC=3 da raw=35.1. Con población media=20 y desviación=10, raw=20.5 da 20.5 FP; con media=25 y desviación=10, raw=35.1 da 30.1 FP. Z≤-2 produce 0 FP y Z≥3 produce 50 FP. DNP produce 0 FP y no entra en la muestra. Una población de 19, desviación 0 o null requerido produce score null con su código estable. Añadir fronteras half-up (20.04→20.0 y 20.05→20.1), negativos raw, empates y actuaciones equivalentes entre ligas. Tests puros verifican determinismo, orden canónico, SHA-256 y breakdown; PostgreSQL verifica unicidad, concurrencia, rollback e histórico entre versiones. Los seedings y partidos aleatorios posteriores calibrarán coeficientes mediante una nueva versión, nunca mutando v1.

