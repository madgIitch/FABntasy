import { createHash } from "node:crypto";

export type PlayerScoreStatus = "CALCULATED" | "DNP" | "PENDING" | "NOT_CALCULABLE" | "ERROR";

export interface StarterScoreInput {
  playerRegistrationId: string;
  displayName: string;
  scores: readonly { id: string; status: PlayerScoreStatus; points: string | null; sourceStatsVersion: string }[];
}

export interface RoundTeamInput {
  fantasyTeamId: string;
  leagueId: string;
  createdAt: Date;
  lineupId: string;
  lineupRevision: number;
  starters: readonly StarterScoreInput[];
}

export interface StarterContribution {
  playerRegistrationId: string;
  displayName: string;
  points: string | null;
  status: PlayerScoreStatus;
}

export interface RoundCalculation {
  status: "PROVISIONAL" | "PUBLISHED";
  points: string | null;
  inputRevision: string;
  contributions: StarterContribution[];
}

function canonicalNumber(value: number): string {
  return value.toFixed(6);
}

export function calculateRoundScore(input: RoundTeamInput): RoundCalculation {
  if (input.starters.length !== 5) throw new Error("FIVE_STARTERS_REQUIRED");
  const contributions = input.starters.map((starter): StarterContribution => {
    const nonTerminal = starter.scores.find((score) => !["CALCULATED", "DNP"].includes(score.status));
    if (nonTerminal) return { playerRegistrationId: starter.playerRegistrationId, displayName: starter.displayName, points: null, status: nonTerminal.status };
    const calculated = starter.scores.filter((score) => score.status === "CALCULATED");
    const points = calculated.reduce((sum, score) => sum + Number(score.points ?? 0), 0);
    return { playerRegistrationId: starter.playerRegistrationId, displayName: starter.displayName, points: canonicalNumber(points), status: calculated.length ? "CALCULATED" : "DNP" };
  });
  const inputRevision = createHash("sha256").update(JSON.stringify({
    lineupId: input.lineupId, lineupRevision: input.lineupRevision,
    starters: input.starters.map((starter) => ({ id: starter.playerRegistrationId, scores: starter.scores.map((score) => [score.id, score.status, score.points, score.sourceStatsVersion]) })),
  })).digest("hex");
  if (contributions.some((item) => item.points === null)) return { status: "PROVISIONAL", points: null, inputRevision, contributions };
  return { status: "PUBLISHED", points: canonicalNumber(contributions.reduce((sum, item) => sum + Number(item.points), 0)), inputRevision, contributions };
}

export interface RankingInput {
  fantasyTeamId: string;
  totalPoints: number;
  lastRoundPoints: number;
  bestRoundPoints: number;
  createdAt: Date;
}

export function rankTeams<T extends RankingInput>(teams: readonly T[]): Array<T & { position: number }> {
  return [...teams].sort((a, b) =>
    b.totalPoints - a.totalPoints || b.lastRoundPoints - a.lastRoundPoints || b.bestRoundPoints - a.bestRoundPoints ||
    a.createdAt.getTime() - b.createdAt.getTime() || a.fantasyTeamId.localeCompare(b.fantasyTeamId),
  ).map((team, index) => ({ ...team, position: index + 1 }));
}
