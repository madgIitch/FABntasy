import type { FantasyScoreDto } from "../server/fantasy-scoring";
import styles from "./fantasy-score-breakdown.module.css";

const labels: Record<string, string> = {
  CALCULATED: "Calculado", DNP: "No participó (DNP)", PENDING: "Pendiente de muestra suficiente",
  NOT_CALCULABLE: "Datos desconocidos o incompletos", ERROR: "Error de cálculo",
};

export function FantasyScoreBreakdown({ score }: { score: FantasyScoreDto }) {
  return <section className={styles.panel} aria-label="Desglose de puntuación fantasy">
    <div className={styles.heading}>
      <div><div className={styles.score}>{score.normalizedFantasyPoints ?? "—"} FP</div><strong>{labels[score.status] ?? score.status}</strong>{score.recalculated && <> · Recalculado</>}</div>
      <small className={styles.meta}>Versión {score.rulesetVersion}<br />Fuente {score.sourceStatsVersion.slice(0, 10)}…</small>
    </div>
    {score.errorCode && <p>Código: {score.errorCode}</p>}
    <p className={styles.formula}><strong>Fórmula:</strong> {score.breakdown.formula}</p>
    <details>
      <summary>Ver conceptos y normalización</summary>
      <dl className={styles.terms}>{score.breakdown.rawTerms.map((term) => <div className={styles.term} key={term.ruleId}>
        <dt>{term.label}</dt><dd>{term.finalContribution ?? "desconocido"}</dd>
        <dd className={styles.explanation}>{term.expression}: valor {term.originalValue ?? "null"} × {term.coefficient}{term.condition ? ` · ${term.condition}` : ""}</dd>
      </div>)}</dl>
      <p>{score.breakdown.normalization.expression}</p>
      {score.breakdown.normalization.population && <p>Referencia: {score.breakdown.normalization.population.count} actuaciones · media {score.breakdown.normalization.population.mean} · desviación {score.breakdown.normalization.population.populationStandardDeviation}</p>}
    </details>
  </section>;
}
