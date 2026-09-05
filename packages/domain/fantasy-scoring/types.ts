export const SNAPSHOT_FIELDS = [
  "minutesPlayed", "points", "freeThrowsMade", "freeThrowsAttempted",
  "twoPointersMade", "twoPointersAttempted", "threePointersMade", "threePointersAttempted",
  "rebounds", "assists", "steals", "turnovers", "blocks", "foulsCommitted",
] as const;

export type SnapshotField = typeof SNAPSHOT_FIELDS[number];
export type StatValue = string | null;

export interface CanonicalBoxscoreSnapshot {
  schemaVersion: "player-game-stat.v1";
  playerGameStatId: string;
  playerId: string;
  gameId: string;
  competitionId: string;
  competitionSeasonId: string;
  roundNumber: number | null;
  stats: Readonly<Record<SnapshotField, StatValue>>;
}

export interface ScoringTermRule {
  readonly id: string;
  readonly label: string;
  readonly expression: string;
  readonly inputs: readonly SnapshotField[];
  readonly coefficient: string;
  readonly required: boolean;
}

export interface FantasyRuleSet {
  readonly identifier: string;
  readonly version: string;
  readonly calculationType: "PROVINCIAL" | "NATIONAL";
  readonly formula: string;
  readonly terms: readonly ScoringTermRule[];
  readonly bonuses: readonly never[];
  readonly nullPolicy: "REJECT_REQUIRED";
  readonly dnpPolicy: "ZERO_MINUTES_ALL_STATS_ZERO";
  readonly allowNegativeRaw: true;
  readonly rounding: Readonly<{ mode: "HALF_UP"; scale: 1; stage: "FINAL_ONLY" }>;
  readonly normalization: Readonly<{ minimumSample: 20; method: "POPULATION_Z_SCORE"; base: "20"; factor: "10"; minimum: "0"; maximum: "50" }>;
}

export type ScoreStatus = "CALCULATED" | "DNP" | "PENDING" | "NOT_CALCULABLE" | "ERROR";
export type ScoreErrorCode = "MISSING_REQUIRED_STAT" | "INSUFFICIENT_NORMALIZATION_SAMPLE" | "ZERO_NORMALIZATION_DEVIATION" | "INVALID_RULESET" | null;

export interface BreakdownTerm {
  ruleId: string;
  label: string;
  expression: string;
  originalValue: string | null;
  coefficient: string;
  condition: string | null;
  unroundedContribution: string | null;
  finalContribution: string | null;
}

export interface NormalizationPopulation { count: number; mean: string; populationStandardDeviation: string; }
export interface FantasyBreakdown {
  schemaVersion: "fantasy-breakdown.v1";
  formula: string;
  rawTerms: BreakdownTerm[];
  normalization: { population: NormalizationPopulation | null; zScore: string | null; expression: string };
  finalScore: { unroundedRaw: string | null; raw: string | null; unroundedFantasyPoints: string | null; fantasyPoints: string | null; rounding: "HALF_UP_1_DECIMAL_FINAL_ONLY" };
}

export interface FantasyCalculation {
  status: ScoreStatus;
  errorCode: ScoreErrorCode;
  rawScore: string | null;
  normalizedFantasyPoints: string | null;
  breakdown: FantasyBreakdown;
}
