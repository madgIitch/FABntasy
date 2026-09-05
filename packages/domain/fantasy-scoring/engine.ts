import { Decimal } from "./decimal";
import { SNAPSHOT_FIELDS, type BreakdownTerm, type CanonicalBoxscoreSnapshot, type FantasyBreakdown, type FantasyCalculation, type FantasyRuleSet, type NormalizationPopulation, type ScoringTermRule } from "./types";

const normalizationExpression = "clamp(20 + 10 × ((raw - mean) / populationStandardDeviation), 0, 50)";

export function calculateFantasyScore(snapshot: CanonicalBoxscoreSnapshot, ruleset: FantasyRuleSet, population: NormalizationPopulation | null): FantasyCalculation {
  const empty = (terms: BreakdownTerm[]): FantasyBreakdown => ({ schemaVersion: "fantasy-breakdown.v1", formula: ruleset.formula, rawTerms: terms, normalization: { population, zScore: null, expression: normalizationExpression }, finalScore: { unroundedRaw: null, raw: null, unroundedFantasyPoints: null, fantasyPoints: null, rounding: "HALF_UP_1_DECIMAL_FINAL_ONLY" } });
  if (isDnp(snapshot)) {
    const breakdown = empty(ruleset.terms.map((rule) => makeTerm(rule, snapshot, "DNP", "0")));
    breakdown.finalScore = { ...breakdown.finalScore, unroundedRaw: "0", raw: "0.0", unroundedFantasyPoints: "0", fantasyPoints: "0.0" };
    return { status: "DNP", errorCode: null, rawScore: "0.0", normalizedFantasyPoints: "0.0", breakdown };
  }
  const terms = ruleset.terms.map((rule) => makeTerm(rule, snapshot));
  if (terms.some((term) => term.originalValue === null)) return { status: "NOT_CALCULABLE", errorCode: "MISSING_REQUIRED_STAT", rawScore: null, normalizedFantasyPoints: null, breakdown: empty(terms) };
  const raw = terms.reduce((sum, term) => sum.add(Decimal.from(term.unroundedContribution!)), Decimal.zero);
  const rawScore = raw.round(1).toString(1);
  const breakdown = empty(terms);
  breakdown.finalScore.unroundedRaw = raw.toString(); breakdown.finalScore.raw = rawScore;
  if (!population || population.count < ruleset.normalization.minimumSample) return { status: "PENDING", errorCode: "INSUFFICIENT_NORMALIZATION_SAMPLE", rawScore, normalizedFantasyPoints: null, breakdown };
  const deviation = Decimal.from(population.populationStandardDeviation);
  if (deviation.compare(Decimal.zero) === 0) return { status: "PENDING", errorCode: "ZERO_NORMALIZATION_DEVIATION", rawScore, normalizedFantasyPoints: null, breakdown };
  const z = raw.sub(Decimal.from(population.mean)).div(deviation);
  const fantasy = Decimal.from(ruleset.normalization.base).add(Decimal.from(ruleset.normalization.factor).mul(z)).clamp(Decimal.from(ruleset.normalization.minimum), Decimal.from(ruleset.normalization.maximum));
  const finalScore = fantasy.round(1).toString(1);
  breakdown.normalization.zScore = z.toString(); breakdown.finalScore.unroundedFantasyPoints = fantasy.toString(); breakdown.finalScore.fantasyPoints = finalScore;
  return { status: "CALCULATED", errorCode: null, rawScore, normalizedFantasyPoints: finalScore, breakdown };
}

export function buildNormalizationPopulation(rawScores: readonly string[]): NormalizationPopulation {
  if (!rawScores.length) return { count: 0, mean: "0", populationStandardDeviation: "0" };
  const values = rawScores.map(Decimal.from); const count = Decimal.from(values.length);
  const mean = values.reduce((sum, value) => sum.add(value), Decimal.zero).div(count);
  const variance = values.reduce((sum, value) => { const delta = value.sub(mean); return sum.add(delta.mul(delta)); }, Decimal.zero).div(count);
  return { count: values.length, mean: mean.toString(), populationStandardDeviation: variance.sqrt().toString() };
}

function makeTerm(rule: ScoringTermRule, snapshot: CanonicalBoxscoreSnapshot, condition: string | null = null, forced?: string): BreakdownTerm {
  const values = rule.inputs.map((input) => snapshot.stats[input]);
  const original = values.some((value) => value === null) ? null : expressionValue(rule.id, values as string[]).toString();
  const contribution = forced ?? (original == null ? null : Decimal.from(original).mul(Decimal.from(rule.coefficient)).toString());
  return { ruleId: rule.id, label: rule.label, expression: rule.expression, originalValue: original, coefficient: rule.coefficient, condition, unroundedContribution: contribution, finalContribution: contribution == null ? null : Decimal.from(contribution).round(1).toString(1) };
}

function expressionValue(ruleId: string, values: string[]): Decimal {
  if (ruleId === "field-goals-missed") return Decimal.from(values[0]).sub(Decimal.from(values[1])).add(Decimal.from(values[2]).sub(Decimal.from(values[3])));
  if (ruleId === "free-throws-missed") return Decimal.from(values[0]).sub(Decimal.from(values[1]));
  return Decimal.from(values[0]);
}

function isDnp(snapshot: CanonicalBoxscoreSnapshot): boolean {
  return snapshot.stats.minutesPlayed === "0" && SNAPSHOT_FIELDS.every((field) => snapshot.stats[field] !== null && Decimal.from(snapshot.stats[field]!).compare(Decimal.zero) === 0);
}
