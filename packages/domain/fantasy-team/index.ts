export const FANTASY_TEAM_SCHEMA_VERSION = "fantasy-team-api.v1" as const;

export type RosterRuleSet = Readonly<{
  identifier: string;
  version: string;
  budgetCredits: number;
  rosterSize: number;
  starters: number;
  substitutes: number;
  maxPerRealTeam: number;
  positionLimits: Readonly<Record<string, number>>;
  coldStartPriceCredits: number;
}>;

export const COLD_START_RULES: RosterRuleSet = Object.freeze({
  identifier: "cold-start",
  version: "2",
  budgetCredits: 60_000_000,
  rosterSize: 7,
  starters: 5,
  substitutes: 2,
  maxPerRealTeam: 2,
  positionLimits: Object.freeze({}),
  coldStartPriceCredits: 3_000_000,
});

export type RosterCandidate = Readonly<{
  playerRegistrationId: string;
  realTeamId: string;
  position?: string | null;
  priceCredits: number;
}>;

export type FantasyTeamErrorCode =
  | "AUTH_REQUIRED" | "TEAM_NOT_FOUND" | "PLAYER_DUPLICATE"
  | "TEAM_LIMIT_EXCEEDED" | "BUDGET_EXCEEDED" | "ROSTER_INVALID"
  | "LINEUP_LOCKED" | "CUTOFF_UNAVAILABLE" | "VERSION_CONFLICT"
  | "PRICE_UNAVAILABLE" | "FEATURE_DISABLED" | "INVALID_INPUT";

export class FantasyTeamRuleError extends Error {
  constructor(public readonly code: FantasyTeamErrorCode) { super(code); }
}

function assertCreditAmount(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new FantasyTeamRuleError("INVALID_INPUT");
}

export function validateRoster(players: readonly RosterCandidate[], rules: RosterRuleSet): { used: number; remaining: number } {
  if (players.length !== rules.rosterSize) throw new FantasyTeamRuleError("ROSTER_INVALID");
  const registrations = new Set<string>();
  const teams = new Map<string, number>();
  const positions = new Map<string, number>();
  let used = 0;
  for (const player of players) {
    assertCreditAmount(player.priceCredits);
    if (registrations.has(player.playerRegistrationId)) throw new FantasyTeamRuleError("PLAYER_DUPLICATE");
    registrations.add(player.playerRegistrationId);
    teams.set(player.realTeamId, (teams.get(player.realTeamId) ?? 0) + 1);
    if ((teams.get(player.realTeamId) ?? 0) > rules.maxPerRealTeam) throw new FantasyTeamRuleError("TEAM_LIMIT_EXCEEDED");
    if (player.position) positions.set(player.position, (positions.get(player.position) ?? 0) + 1);
    used += player.priceCredits;
    if (!Number.isSafeInteger(used)) throw new FantasyTeamRuleError("INVALID_INPUT");
  }
  for (const [position, maximum] of Object.entries(rules.positionLimits)) {
    if ((positions.get(position) ?? 0) > maximum) throw new FantasyTeamRuleError("ROSTER_INVALID");
  }
  if (used > rules.budgetCredits) throw new FantasyTeamRuleError("BUDGET_EXCEEDED");
  return { used, remaining: rules.budgetCredits - used };
}

export function validateLineup(starters: readonly string[], substitutes: readonly string[], roster: readonly string[], rules: RosterRuleSet): void {
  if (starters.length !== rules.starters || substitutes.length !== rules.substitutes) throw new FantasyTeamRuleError("ROSTER_INVALID");
  const selected = [...starters, ...substitutes];
  if (new Set(selected).size !== selected.length) throw new FantasyTeamRuleError("PLAYER_DUPLICATE");
  const rosterSet = new Set(roster);
  if (selected.length !== rules.rosterSize || selected.some((id) => !rosterSet.has(id))) throw new FantasyTeamRuleError("ROSTER_INVALID");
}

export function isCutoffClosed(serverNow: Date, cutoffAt: Date): boolean {
  return serverNow.getTime() >= cutoffAt.getTime();
}
