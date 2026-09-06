import { Prisma, type PrismaClient } from "@prisma/client";
import { COLD_START_RULES, FantasyTeamRuleError, isCutoffClosed, validateLineup, validateRoster } from "../../../../packages/domain/fantasy-team";
import { createLeagueCode } from "../../../../packages/domain/private-league";
import { db } from "./db";

type Client = PrismaClient | Prisma.TransactionClient;
export type TeamActor = Readonly<{ authUserId: string }>;
export type RosterInput = Readonly<{ playerRegistrationIds: readonly string[]; expectedVersion?: number }>;
export type LineupInput = Readonly<{
  starterPlayerRegistrationIds: readonly string[];
  substitutePlayerRegistrationIds: readonly string[];
  expectedVersion: number;
}>;

export class FantasyTeamServiceError extends Error {
  constructor(public readonly code: FantasyTeamRuleError["code"], public readonly status: number) { super(code); }
}

function fail(code: FantasyTeamRuleError["code"], status = 409): never { throw new FantasyTeamServiceError(code, status); }
const featureEnabled = () => process.env.FANTASY_TEAM_MUTATIONS_ENABLED !== "false";
const asNumber = (value: bigint) => {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) fail("INVALID_INPUT", 422);
  return result;
};

async function profileId(client: Client, actor: TeamActor): Promise<string> {
  const profile = await client.userProfile.findUnique({ where: { authUserId: actor.authUserId }, select: { id: true } });
  if (!profile) fail("TEAM_NOT_FOUND", 404);
  return profile.id;
}

async function activeRules(tx: Prisma.TransactionClient, competitionSeasonId: string) {
  const found = await tx.fantasyRosterRuleSet.findFirst({ where: { competitionSeasonId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  if (found) return found;
  const season = await tx.competitionSeason.findUnique({ where: { id: competitionSeasonId }, select: { id: true } });
  if (!season) fail("TEAM_NOT_FOUND", 404);
  return tx.fantasyRosterRuleSet.create({ data: {
    competitionSeasonId, identifier: COLD_START_RULES.identifier, version: COLD_START_RULES.version,
    budgetCredits: BigInt(COLD_START_RULES.budgetCredits), rosterSize: COLD_START_RULES.rosterSize,
    starterCount: COLD_START_RULES.starters, substituteCount: COLD_START_RULES.substitutes,
    maxPerRealTeam: COLD_START_RULES.maxPerRealTeam, positionLimits: COLD_START_RULES.positionLimits,
    coldStartPriceCredits: BigInt(COLD_START_RULES.coldStartPriceCredits),
  } });
}

const playerSelect = { playerRegistrationId: true, acquisitionPrice: true, playerRegistration: { select: {
  player: { select: { id: true, displayName: true } }, teamRegistration: { select: { team: { select: { id: true, name: true } } } },
  prices: { orderBy: { updatedAt: "desc" as const }, take: 1, select: { currentPrice: true } },
} } } as const;

function rosterDto(slots: readonly { playerRegistrationId: string; acquisitionPrice: bigint; playerRegistration: { player: { id: string; displayName: string }; teamRegistration: { team: { id: string; name: string } }; prices: { currentPrice: bigint }[] } }[]) {
  return slots.map((slot) => ({ playerRegistrationId: slot.playerRegistrationId, playerId: slot.playerRegistration.player.id,
    displayName: slot.playerRegistration.player.displayName, realTeamId: slot.playerRegistration.teamRegistration.team.id,
    realTeamName: slot.playerRegistration.teamRegistration.team.name, acquisitionPrice: asNumber(slot.acquisitionPrice), currentMarketPrice: slot.playerRegistration.prices[0] ? asNumber(slot.playerRegistration.prices[0].currentPrice) : null }));
}

async function serializeTeam(client: Client, teamId: string, roundNumber?: number) {
  const team = await client.fantasyTeam.findUniqueOrThrow({ where: { id: teamId }, include: { rosterRuleSet: true, rosterSlots: { select: playerSelect, orderBy: { createdAt: "asc" } } } });
  const roster = rosterDto(team.rosterSlots);
  const used = roster.reduce((sum, item) => sum + item.acquisitionPrice, 0);
  const lineup = roundNumber === undefined ? null : await client.fantasyLineup.findFirst({ where: { fantasyTeamId: team.id, roundNumber, supersededAt: null }, include: { slots: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] } } });
  const snapshot = (slot: NonNullable<typeof lineup>["slots"][number]) => ({ playerRegistrationId: slot.playerRegistrationId, playerId: slot.playerIdSnapshot,
    displayName: slot.displayNameSnapshot, realTeamId: slot.realTeamIdSnapshot, realTeamName: slot.realTeamNameSnapshot,
    acquisitionPrice: asNumber(slot.acquisitionPrice), currentMarketPrice: slot.marketPriceSnapshot === null ? null : asNumber(slot.marketPriceSnapshot) });
  return { teamId: team.id, competitionSeasonId: team.competitionSeasonId, version: team.version,
    rules: { identifier: team.rosterRuleSet.identifier, version: team.rosterRuleSet.version },
    budgetTotal: asNumber(team.rosterRuleSet.budgetCredits), budgetUsed: used,
    budgetRemaining: asNumber(team.rosterRuleSet.budgetCredits) - used, roster,
    lineup: lineup ? { roundNumber: lineup.roundNumber, status: lineup.status, cutoffAt: lineup.cutoffAt.toISOString(), lockedAt: lineup.lockedAt?.toISOString() ?? null,
      starters: lineup.slots.filter((x) => x.role === "STARTER").map(snapshot), substitutes: lineup.slots.filter((x) => x.role === "SUBSTITUTE").map(snapshot) } : null };
}

export async function getFantasyTeam(actor: TeamActor, competitionSeasonId: string, roundNumber?: number) {
  const owner = await profileId(db, actor);
  const team = await db.fantasyTeam.findFirst({ where: { userProfileId: owner, competitionSeasonId, league: { status: "ACTIVE" } }, orderBy: { updatedAt: "desc" }, select: { id: true } });
  if (!team) fail("TEAM_NOT_FOUND", 404);
  if (roundNumber !== undefined) await lockExpiredLineup(team.id, roundNumber);
  return serializeTeam(db, team.id, roundNumber);
}

async function lockExpiredLineup(teamId: string, roundNumber: number): Promise<void> {
  await db.$transaction(async (tx) => {
    const current = await tx.fantasyLineup.findFirst({ where: { fantasyTeamId: teamId, roundNumber, supersededAt: null, status: "DRAFT" }, select: { id: true, cutoffAt: true } });
    if (!current) return;
    const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>(Prisma.sql`SELECT clock_timestamp() AS now`);
    if (isCutoffClosed(now, current.cutoffAt)) await tx.fantasyLineup.update({ where: { id: current.id }, data: { status: "LOCKED", lockedAt: now } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function putRoster(actor: TeamActor, competitionSeasonId: string, input: RosterInput) {
  if (!featureEnabled()) fail("FEATURE_DISABLED");
  if (!Array.isArray(input.playerRegistrationIds) || input.playerRegistrationIds.some((x) => typeof x !== "string")) fail("INVALID_INPUT", 422);
  try {
    return await db.$transaction(async (tx) => {
      const owner = await profileId(tx, actor);
      const rules = await activeRules(tx, competitionSeasonId);
      const registrations = await tx.playerRegistration.findMany({ where: { id: { in: [...input.playerRegistrationIds] }, competitionSeasonId }, include: {
        teamRegistration: { select: { teamId: true } }, prices: { orderBy: { updatedAt: "desc" }, take: 1, select: { currentPrice: true } },
      } });
      if (registrations.length !== new Set(input.playerRegistrationIds).size) fail("ROSTER_INVALID");
      const dynamicPricingActive = await tx.playerPrice.count({ where: { competitionSeasonId } }) > 0;
      const acquisitionPrices = new Map(registrations.map((registration) => {
        if (dynamicPricingActive && !registration.prices[0]) fail("PRICE_UNAVAILABLE");
        return [registration.id, registration.prices[0]?.currentPrice ?? rules.coldStartPriceCredits] as const;
      }));
      validateRoster(input.playerRegistrationIds.map((id) => { const registration = registrations.find((x) => x.id === id)!; return { playerRegistrationId: id, realTeamId: registration.teamRegistration.teamId, priceCredits: asNumber(acquisitionPrices.get(id)!) }; }), {
        identifier: rules.identifier, version: rules.version, budgetCredits: asNumber(rules.budgetCredits), rosterSize: rules.rosterSize,
        starters: rules.starterCount, substitutes: rules.substituteCount, maxPerRealTeam: rules.maxPerRealTeam,
        positionLimits: rules.positionLimits as Record<string, number>, coldStartPriceCredits: asNumber(rules.coldStartPriceCredits),
      });
      let team = await tx.fantasyTeam.findFirst({ where: { userProfileId: owner, competitionSeasonId, league: { status: "ACTIVE" } }, orderBy: { updatedAt: "desc" } });
      const created = !team;
      if (!team) {
        const league = await tx.fantasyLeague.create({ data: { ownerProfileId: owner, competitionSeasonId, name: "Liga personal", memberLimit: 20, leagueCode: createLeagueCode() } });
        await tx.leagueMembership.create({ data: { leagueId: league.id, userProfileId: owner, role: "OWNER" } });
        team = await tx.fantasyTeam.create({ data: { userProfileId: owner, competitionSeasonId, rosterRuleSetId: rules.id, leagueId: league.id } });
      }
      else {
        if (input.expectedVersion === undefined || input.expectedVersion !== team.version) fail("VERSION_CONFLICT");
        team = await tx.fantasyTeam.update({ where: { id: team.id, version: input.expectedVersion }, data: { version: { increment: 1 }, rosterRuleSetId: rules.id } });
        await tx.fantasyRosterSlot.deleteMany({ where: { fantasyTeamId: team.id } });
      }
      await tx.fantasyRosterSlot.createMany({ data: input.playerRegistrationIds.map((playerRegistrationId) => ({ fantasyTeamId: team!.id, leagueId: team!.leagueId, playerRegistrationId, acquisitionPrice: acquisitionPrices.get(playerRegistrationId)! })) });
      return { created, team: await serializeTeam(tx, team.id) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) { mapPrisma(error); }
}

export async function putLineup(actor: TeamActor, competitionSeasonId: string, roundNumber: number, input: LineupInput) {
  if (!featureEnabled()) fail("FEATURE_DISABLED");
  if (!Number.isInteger(roundNumber) || roundNumber < 1 || !Array.isArray(input.starterPlayerRegistrationIds) || !Array.isArray(input.substitutePlayerRegistrationIds) || !Number.isInteger(input.expectedVersion)) fail("INVALID_INPUT", 422);
  try {
    return await db.$transaction(async (tx) => {
      const owner = await profileId(tx, actor);
      const team = await tx.fantasyTeam.findFirst({ where: { userProfileId: owner, competitionSeasonId, league: { status: "ACTIVE" } }, orderBy: { updatedAt: "desc" }, include: { rosterRuleSet: true, rosterSlots: { select: playerSelect } } });
      if (!team) fail("TEAM_NOT_FOUND", 404);
      if (team.version !== input.expectedVersion) fail("VERSION_CONFLICT");
      validateLineup(input.starterPlayerRegistrationIds, input.substitutePlayerRegistrationIds, team.rosterSlots.map((x) => x.playerRegistrationId), {
        identifier: team.rosterRuleSet.identifier, version: team.rosterRuleSet.version, budgetCredits: asNumber(team.rosterRuleSet.budgetCredits), rosterSize: team.rosterRuleSet.rosterSize,
        starters: team.rosterRuleSet.starterCount, substitutes: team.rosterRuleSet.substituteCount, maxPerRealTeam: team.rosterRuleSet.maxPerRealTeam,
        positionLimits: team.rosterRuleSet.positionLimits as Record<string, number>, coldStartPriceCredits: asNumber(team.rosterRuleSet.coldStartPriceCredits),
      });
      const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>(Prisma.sql`SELECT clock_timestamp() AS now`);
      const current = await tx.fantasyLineup.findFirst({ where: { fantasyTeamId: team.id, roundNumber, supersededAt: null } });
      // A persisted cutoff is authoritative once reached, even if the game is
      // subsequently postponed. This prevents a closed round from reopening.
      if (current && isCutoffClosed(now, current.cutoffAt)) {
        if (current.status === "DRAFT") await tx.fantasyLineup.update({ where: { id: current.id }, data: { status: "LOCKED", lockedAt: now } });
        fail("LINEUP_LOCKED");
      }
      const games = await tx.$queryRaw<Array<{ scheduled_at: Date; source_timezone: string | null }>>(Prisma.sql`SELECT scheduled_at, source_timezone FROM games WHERE competition_season_id=${competitionSeasonId}::uuid AND round_number=${roundNumber} AND sync_status='active' ORDER BY scheduled_at ASC FOR UPDATE`);
      if (!games.length || games.some((game) => !game.scheduled_at || !game.source_timezone)) fail("CUTOFF_UNAVAILABLE");
      const cutoffAt = games[0].scheduled_at;
      if (isCutoffClosed(now, cutoffAt)) fail("LINEUP_LOCKED");
      if (current) await tx.fantasyLineup.update({ where: { id: current.id }, data: { supersededAt: now } });
      const lineup = await tx.fantasyLineup.create({ data: { fantasyTeamId: team.id, roundNumber, revision: (current?.revision ?? 0) + 1, cutoffAt } });
      const byId = new Map(team.rosterSlots.map((slot) => [slot.playerRegistrationId, slot]));
      await tx.fantasyLineupSlot.createMany({ data: [...input.starterPlayerRegistrationIds.map((id, ordinal) => ({ id, ordinal, role: "STARTER" })), ...input.substitutePlayerRegistrationIds.map((id, ordinal) => ({ id, ordinal, role: "SUBSTITUTE" }))].map(({ id, ordinal, role }) => {
        const slot = byId.get(id)!; const player = slot.playerRegistration.player; const realTeam = slot.playerRegistration.teamRegistration.team;
        return { fantasyLineupId: lineup.id, playerRegistrationId: id, role, ordinal, playerIdSnapshot: player.id, displayNameSnapshot: player.displayName,
          realTeamIdSnapshot: realTeam.id, realTeamNameSnapshot: realTeam.name, acquisitionPrice: slot.acquisitionPrice };
      }) });
      await tx.fantasyTeam.update({ where: { id: team.id, version: input.expectedVersion }, data: { version: { increment: 1 } } });
      return serializeTeam(tx, team.id, roundNumber);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) { mapPrisma(error); }
}

function mapPrisma(error: unknown): never {
  if (error instanceof FantasyTeamServiceError) throw error;
  if (error instanceof FantasyTeamRuleError) fail(error.code);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2034") fail("VERSION_CONFLICT");
    if (error.code === "P2025") fail("VERSION_CONFLICT");
    if (error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.includes("player_registration_id")) fail("PLAYER_DUPLICATE");
      fail("VERSION_CONFLICT");
    }
  }
  throw error;
}
