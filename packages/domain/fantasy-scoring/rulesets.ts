import type { FantasyRuleSet, ScoringTermRule, SnapshotField } from "./types";

const term = (id: string, label: string, expression: string, inputs: SnapshotField[], coefficient: string): ScoringTermRule =>
  Object.freeze({ id, label, expression, inputs: Object.freeze(inputs), coefficient, required: true });

const shared = {
  bonuses: Object.freeze([]) as readonly never[],
  nullPolicy: "REJECT_REQUIRED" as const,
  dnpPolicy: "ZERO_MINUTES_ALL_STATS_ZERO" as const,
  allowNegativeRaw: true as const,
  rounding: Object.freeze({ mode: "HALF_UP" as const, scale: 1 as const, stage: "FINAL_ONLY" as const }),
  normalization: Object.freeze({ minimumSample: 20 as const, method: "POPULATION_Z_SCORE" as const, base: "20", factor: "10", minimum: "0", maximum: "50" }),
};

export const PROVINCIAL_V1: FantasyRuleSet = Object.freeze({
  identifier: "canastio.provincial.player-game", version: "1.0.0", calculationType: "PROVINCIAL",
  formula: "PTS + 0.50×3PM + 0.25×FTM - 0.50×FC",
  terms: Object.freeze([
    term("points", "Puntos", "PTS", ["points"], "1"),
    term("three-pointers", "Triples anotados", "3PM", ["threePointersMade"], "0.50"),
    term("free-throws", "Tiros libres anotados", "FTM", ["freeThrowsMade"], "0.25"),
    term("fouls", "Faltas cometidas", "FC", ["foulsCommitted"], "-0.50"),
  ]), ...shared,
});

export const NATIONAL_V1: FantasyRuleSet = Object.freeze({
  identifier: "canastio.national.player-game", version: "1.0.0", calculationType: "NATIONAL",
  formula: "PTS + 1.20×REB + 1.50×AST + 3.00×STL + 3.00×BLK - 1.50×TO - 0.50×(FGA-FGM) - 0.50×(FTA-FTM) - 0.50×FC",
  terms: Object.freeze([
    term("points", "Puntos", "PTS", ["points"], "1"), term("rebounds", "Rebotes", "REB", ["rebounds"], "1.20"),
    term("assists", "Asistencias", "AST", ["assists"], "1.50"), term("steals", "Robos", "STL", ["steals"], "3.00"),
    term("blocks", "Tapones", "BLK", ["blocks"], "3.00"), term("turnovers", "Pérdidas", "TO", ["turnovers"], "-1.50"),
    term("field-goals-missed", "Tiros de campo fallados", "FGA-FGM", ["twoPointersAttempted", "twoPointersMade", "threePointersAttempted", "threePointersMade"], "-0.50"),
    term("free-throws-missed", "Tiros libres fallados", "FTA-FTM", ["freeThrowsAttempted", "freeThrowsMade"], "-0.50"),
    term("fouls", "Faltas cometidas", "FC", ["foulsCommitted"], "-0.50"),
  ]), ...shared,
});

export const OFFICIAL_V1_EXAMPLES = Object.freeze({
  provincial: "PTS=20, 3PM=2, FTM=4, FC=3 → raw 20.5",
  national: "PTS=20, REB=8, AST=5, STL=2, BLK=1, TO=3, FGM=7, FGA=15, FTM=4, FTA=6, FC=3 → raw 35.1",
});
