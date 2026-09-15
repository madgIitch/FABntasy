export const MANAGER_PROFILE_SCHEMA_VERSION = "manager-profile-api.v1" as const;
export const TROPHY_RULE_VERSION = "trophy-icons.v1" as const;
export const STREAK_RULE_VERSION = "manager-streak.v1" as const;

export const TROPHY_ICONS = {
  LEAGUE_LAST_PLACE: { src: "/images/achievements/trophy-league-last-place.png", label: "Último de la liga", repeatable: false },
  ROUND_LAST_PLACE: { src: "/images/achievements/achievement-round-last-place.png", label: "Último de la jornada", repeatable: true },
  CURRENT_LEAGUE_LEADER: { src: "/images/achievements/badge-current-league-leader.png", label: "Líder actual", repeatable: false },
  ROUND_MVP: { src: "/images/achievements/achievement-round-mvp.png", label: "MVP de jornada", repeatable: true },
  LEAGUE_SECOND_PLACE: { src: "/images/achievements/trophy-league-second-place.png", label: "Segundo de la liga", repeatable: false },
  LEAGUE_FIRST_PLACE: { src: "/images/achievements/trophy-league-first-place.png", label: "Campeón de la liga", repeatable: false },
  LEAGUE_THIRD_PLACE: { src: "/images/achievements/trophy-league-third-place.png", label: "Tercero de la liga", repeatable: false },
} as const;
export type TrophyType = keyof typeof TROPHY_ICONS;

export type StreakRound = { seasonId: string; roundNumber: number; revision: number; points: number | null; maxPoints: number | null };
export function calculateStreak(rows: StreakRound[]) {
  const latest = new Map<string, StreakRound>();
  for (const row of rows) {
    const key = `${row.seasonId}:${row.roundNumber}`;
    if (!latest.has(key) || latest.get(key)!.revision < row.revision) latest.set(key, row);
  }
  const ordered = [...latest.values()].sort((a, b) => a.seasonId.localeCompare(b.seasonId) || a.roundNumber - b.roundNumber);
  const last = ordered.at(-1);
  if (!last) return { ruleVersion: STREAK_RULE_VERSION, type: "NONE" as const, length: 0, seasonId: null, firstRound: null, lastRound: null };
  const season = ordered.filter((row) => row.seasonId === last.seasonId);
  const run: StreakRound[] = [];
  for (let index = season.length - 1; index >= 0; index--) {
    const row = season[index];
    if (run[0] && run[0].roundNumber - row.roundNumber !== 1) break;
    if (row.points === null || row.maxPoints === null || row.points !== row.maxPoints) break;
    run.unshift(row);
  }
  return { ruleVersion: STREAK_RULE_VERSION, type: run.length ? "MVP" as const : "NONE" as const, length: run.length, seasonId: last.seasonId, firstRound: run[0]?.roundNumber ?? null, lastRound: run.at(-1)?.roundNumber ?? null };
}

export function publicInitials(value: string) {
  const parts = value.replace(/^@/, "").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)![0]}` : parts[0]?.slice(0, 2) || "M").toUpperCase();
}
