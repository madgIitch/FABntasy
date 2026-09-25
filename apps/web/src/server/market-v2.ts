import { Prisma } from "@prisma/client";
import { PLAYER_PRICING_V1 } from "../../../../packages/domain/player-pricing";
import { db } from "./db";
import { requireFantasyCompetition } from "./fantasy-availability";
import { invalidateCache, cacheTags } from "./performance";
import { appendLeagueEvent } from "./social-league";
import { enqueuePushEvent, wakePushWorker } from "./push-outbox";
import { invalidatePlayerNegotiations } from "./market-offer-invalidation";
import { activeOfferReservations } from "./market-reservations";

type Tx = Prisma.TransactionClient;
export class MarketV2Error extends Error { constructor(public code: string, public status = 409) { super(code); } }
function fail(code: string, status = 409): never { throw new MarketV2Error(code, status); }
async function serializable<T>(body: (tx: Tx) => Promise<T>, timeout = 30000): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(body, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout }); }
    catch (error) { if ((error as { code?: string }).code !== "P2034" || attempt === 2) throw error; }
  }
  throw new Error("MARKET_TRANSACTION_RETRY_EXHAUSTED");
}
const zone = "Europe/Madrid";
const clock = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
function parts(date: Date) { return Object.fromEntries(clock.formatToParts(date).filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)])) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>; }
function madridMidnight(year: number, month: number, day: number) {
  const target = Date.UTC(year, month - 1, day);
  let guess = target;
  for (let i = 0; i < 3; i++) { const p = parts(new Date(guess)); const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second); guess += target - local; }
  return new Date(guess);
}
export function nextMarketMidnight(now: Date) { const p = parts(now); const next = new Date(Date.UTC(p.year, p.month - 1, p.day + 1)); return madridMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()); }
export function currentMarketMidnight(now: Date) { const p = parts(now); return madridMidnight(p.year, p.month, p.day); }
export function rotatingCandidates<T extends { id: string }>(candidates: readonly T[], ownedIds: ReadonlySet<string>, lastSeen: ReadonlyMap<string, number>, limit = 12): T[] {
  return candidates.filter(x => !ownedIds.has(x.id)).sort((a, b) => (lastSeen.get(a.id) ?? 0) - (lastSeen.get(b.id) ?? 0) || a.id.localeCompare(b.id)).slice(0, limit);
}
export function rankMarketBids<T extends { id: string; amountCredits: bigint; bidAt: Date }>(bids: readonly T[]): T[] {
  return [...bids].sort((a, b) => Number(b.amountCredits - a.amountCredits) || a.bidAt.getTime() - b.bidAt.getTime() || a.id.localeCompare(b.id));
}
type HistoryBid = { fantasyTeamId: string; status: string; amountCredits: bigint; fantasyTeam: { userProfile: { username: string | null; displayName: string | null } } };
export function projectMarketResult(playerRegistrationId: string, bids: readonly HistoryBid[], viewerTeamId: string) {
  const settledBids = bids.filter(b => b.status === "WON" || b.status === "LOST");
  const participated = settledBids.some(b => b.fantasyTeamId === viewerTeamId);
  const winner = settledBids.find(b => b.status === "WON");
  return { playerRegistrationId, result: settledBids.find(b => b.fantasyTeamId === viewerTeamId)?.status ?? null,
    winner: winner ? (winner.fantasyTeam.userProfile.username ?? winner.fantasyTeam.userProfile.displayName ?? "Manager") : null,
    winningPrice: Number(winner?.amountCredits ?? 0n),
    bids: participated ? settledBids.map(b => ({ manager: b.fantasyTeam.userProfile.username ?? b.fantasyTeam.userProfile.displayName ?? "Manager", amountCredits: Number(b.amountCredits), status: b.status })) : [] };
}

export async function marketV2State() { const row = await db.marketV2Setting.findUnique({ where: { id: "global" } }); return { active: Boolean(row), startedAt: row?.startedAt.toISOString() ?? null }; }
export async function startMarketV2(actorProfileId: string) {
  const result = await serializable(async tx => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('market-v2:activation'))`);
    const prior = await tx.marketV2Setting.findUnique({ where: { id: "global" } });
    if (prior) return { active: true, startedAt: prior.startedAt.toISOString(), alreadyStarted: true };
    const now = new Date();
    await tx.marketV2Setting.create({ data: { id: "global", startedAt: now, startedByProfileId: actorProfileId } });
    await tx.adminAuditEvent.create({ data: { actorProfileId, action: "MARKET_V2_START", resourceType: "MARKET_V2", resourceId: "global", result: "SUCCESS" } });
    return { active: true, startedAt: now.toISOString(), alreadyStarted: false };
  });
  invalidateCache(cacheTags({ leagueId: "global" }));
  await advanceAllMarketV2();
  return result;
}

async function price(tx: Tx, playerRegistrationId: string, competitionSeasonId: string) {
  const row = await tx.playerPrice.findFirst({ where: { playerRegistrationId, competitionSeasonId }, orderBy: { updatedAt: "desc" }, select: { currentPrice: true } });
  return row?.currentPrice ?? BigInt(PLAYER_PRICING_V1.initialPrice);
}

async function selectListings(tx: Tx, cycleId: string, leagueId: string, competitionSeasonId: string) {
  const [owned, registrations, history] = await Promise.all([
    tx.fantasyRosterSlot.findMany({ where: { leagueId }, select: { playerRegistrationId: true } }),
    tx.playerRegistration.findMany({ where: { competitionSeasonId, identityStatus: { not: "CONFLICT" } }, select: { id: true } }),
    tx.marketV2Listing.findMany({ where: { leagueId }, orderBy: { createdAt: "desc" }, select: { playerRegistrationId: true, createdAt: true } }),
  ]);
  const ownedIds = new Set(owned.map(x => x.playerRegistrationId));
  const lastSeen = new Map<string, number>();
  for (const row of history) if (!lastSeen.has(row.playerRegistrationId)) lastSeen.set(row.playerRegistrationId, row.createdAt.getTime());
  const selected = rotatingCandidates(registrations, ownedIds, lastSeen);
  for (const item of selected) await tx.marketV2Listing.create({ data: { cycleId, leagueId, playerRegistrationId: item.id, referencePrice: await price(tx, item.id, competitionSeasonId) } });
}

async function cancelCycle(tx: Tx, cycleId: string, now: Date) {
  const listings = await tx.marketV2Listing.findMany({ where: { cycleId }, select: { id: true } });
  await tx.marketV2Bid.updateMany({ where: { listingId: { in: listings.map(x => x.id) }, status: "ACTIVE" }, data: { status: "INVALID" } });
  await tx.marketV2Listing.updateMany({ where: { cycleId, status: "OPEN" }, data: { status: "CANCELLED" } });
  await tx.marketV2Cycle.update({ where: { id: cycleId }, data: { status: "CANCELLED", settledAt: now } });
}

async function settleCycle(tx: Tx, cycleId: string, now: Date) {
  const cycle = await tx.marketV2Cycle.findUniqueOrThrow({ where: { id: cycleId }, include: { league: true, listings: { include: { bids: true } } } });
  if (cycle.status !== "OPEN" || cycle.closesAt > now) return;
  const season = await tx.competitionSeason.findUniqueOrThrow({ where: { id: cycle.league.competitionSeasonId }, select: { fantasyEnabled: true } });
  if (!season.fantasyEnabled) { await cancelCycle(tx, cycleId, now); return; }
  for (const listing of cycle.listings) {
    const bids = rankMarketBids(listing.bids.filter(b => b.status === "ACTIVE"));
    const owner = await tx.fantasyRosterSlot.findUnique({ where: { leagueId_playerRegistrationId: { leagueId: cycle.leagueId, playerRegistrationId: listing.playerRegistrationId } }, select: { id: true } });
    let winnerId: string | null = null;
    if (!owner) for (const bid of bids) {
      const team = await tx.fantasyTeam.findUnique({ where: { id: bid.fantasyTeamId }, include: { rosterRuleSet: true, userProfile: true } });
      if (!team || team.balanceCredits === null) { await tx.marketV2Bid.update({ where: { id: bid.id }, data: { status: "INVALID" } }); continue; }
      const [count, player, offers] = await Promise.all([tx.fantasyRosterSlot.count({ where: { fantasyTeamId: team.id } }), tx.playerRegistration.findUnique({ where: { id: listing.playerRegistrationId }, select: { teamRegistrationId: true, identityStatus: true } }), activeOfferReservations(tx, team.id, now)]);
      if (team.balanceCredits < bid.amountCredits + offers.amount || !player || player.identityStatus === "CONFLICT" || count + offers.count >= team.rosterRuleSet.rosterSize) { await tx.marketV2Bid.update({ where: { id: bid.id }, data: { status: "INVALID" } }); continue; }
      const same = await tx.fantasyRosterSlot.count({ where: { fantasyTeamId: team.id, playerRegistration: { teamRegistrationId: player.teamRegistrationId } } });
      if (same + offers.teamIds.filter(id => id === player.teamRegistrationId).length >= team.rosterRuleSet.maxPerRealTeam) { await tx.marketV2Bid.update({ where: { id: bid.id }, data: { status: "INVALID" } }); continue; }
      const balance = team.balanceCredits - bid.amountCredits;
      const transaction = await tx.marketTransaction.create({ data: { leagueId: cycle.leagueId, playerRegistrationId: listing.playerRegistrationId, buyerTeamId: team.id, transactionType: "AUCTION", priceCredits: bid.amountCredits, marketPriceCredits: listing.referencePrice, idempotencyKey: `market-v2:${listing.id}` } });
      await tx.fantasyRosterSlot.create({ data: { fantasyTeamId: team.id, leagueId: cycle.leagueId, playerRegistrationId: listing.playerRegistrationId, acquisitionPrice: bid.amountCredits } });
      await invalidatePlayerNegotiations(tx, cycle.leagueId, listing.playerRegistrationId);
      await tx.fantasyTeam.update({ where: { id: team.id }, data: { balanceCredits: balance, version: { increment: 1 } } });
      await tx.fantasyBudgetLedgerEntry.create({ data: { fantasyTeamId: team.id, leagueId: cycle.leagueId, transactionId: transaction.id, entryType: "AUCTION_BUY", amountCredits: -bid.amountCredits, balanceAfter: balance } });
      const nextGame = await tx.game.findFirst({ where: { competitionSeasonId: team.competitionSeasonId, scheduledAt: { gt: now }, roundNumber: { not: null } }, orderBy: { scheduledAt: "asc" }, select: { roundNumber: true, scheduledAt: true } });
      if (nextGame?.scheduledAt) await tx.marketProtection.create({ data: { leagueId: cycle.leagueId, fantasyTeamId: team.id, playerRegistrationId: listing.playerRegistrationId, protectionType: "NEW_SIGNING", roundNumber: nextGame.roundNumber!, protectedUntil: nextGame.scheduledAt } });
      await tx.marketV2Bid.update({ where: { id: bid.id }, data: { status: "WON", transactionId: transaction.id } });
      const playerName = await tx.playerRegistration.findUnique({ where: { id: listing.playerRegistrationId }, select: { player: { select: { displayName: true } } } });
      await appendLeagueEvent(tx, { leagueId: cycle.leagueId, type: "PLAYER_BOUGHT", actorProfileId: team.userProfileId, sourceType: "MARKET_TRANSACTION", sourceId: transaction.id, payload: { affectedName: playerName?.player.displayName ?? "Jugador", magnitude: Number(bid.amountCredits), unit: "credits", destination: "/app/mercado" } });
      await enqueuePushEvent(tx, { userProfileId: team.userProfileId, leagueId: cycle.leagueId, intent: "MARKET_SOLD", eventKey: `market-v2:${listing.id}:winner`, title: "Puja adjudicada", body: "Has fichado un jugador del mercado.", destination: "/app/mercado" });
      winnerId = bid.id;
      break;
    }
    await tx.marketV2Bid.updateMany({ where: { listingId: listing.id, status: "ACTIVE" }, data: { status: "LOST" } });
    const losingBids = await tx.marketV2Bid.findMany({ where: { listingId: listing.id, status: "LOST" }, select: { id: true, fantasyTeam: { select: { userProfileId: true } } } });
    for (const bid of losingBids) await enqueuePushEvent(tx, { userProfileId: bid.fantasyTeam.userProfileId, leagueId: cycle.leagueId, intent: "MARKET_SOLD", eventKey: `market-v2:${listing.id}:${bid.id}:lost`, title: "Puja no adjudicada", body: "Consulta el resultado del mercado de ayer.", destination: "/app/mercado" });
    await tx.marketV2Listing.update({ where: { id: listing.id }, data: { status: winnerId ? "SOLD" : "EXPIRED" } });
  }
  await tx.marketV2Cycle.update({ where: { id: cycleId }, data: { status: "SETTLED", settledAt: now } });
}

export async function advanceMarketV2(leagueId: string, now = new Date()) {
  const setting = await db.marketV2Setting.findUnique({ where: { id: "global" } });
  if (!setting || now < setting.startedAt) return null;
  const result = await serializable(async tx => {
    const league = await tx.fantasyLeague.findUnique({ where: { id: leagueId }, include: { competitionSeason: { select: { fantasyEnabled: true } } } });
    if (!league || league.status !== "ACTIVE") return null;
    await tx.$queryRaw(Prisma.sql`SELECT fantasy_enabled FROM competition_seasons WHERE id=${league.competitionSeasonId}::uuid FOR SHARE`);
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${leagueId}))`);
    const open = await tx.marketV2Cycle.findMany({ where: { leagueId, status: "OPEN" }, orderBy: { opensAt: "asc" } });
    for (const cycle of open) if (!league.competitionSeason.fantasyEnabled) await cancelCycle(tx, cycle.id, now); else if (cycle.closesAt <= now) await settleCycle(tx, cycle.id, now);
    if (!league.competitionSeason.fantasyEnabled) return null;
    const current = await tx.marketV2Cycle.findFirst({ where: { leagueId, status: "OPEN", closesAt: { gt: now } }, orderBy: { opensAt: "desc" } });
    if (current) return current;
    const opensAt = new Date(Math.max(setting.startedAt.getTime(), currentMarketMidnight(now).getTime()));
    const cycle = await tx.marketV2Cycle.create({ data: { leagueId, opensAt, closesAt: nextMarketMidnight(now) } });
    await selectListings(tx, cycle.id, leagueId, league.competitionSeasonId);
    return cycle;
  });
  invalidateCache(cacheTags({ leagueId }));
  void wakePushWorker();
  return result;
}

export async function getMarketV2ForActor(authUserId: string, leagueId: string) {
  const profile = await db.userProfile.findUnique({ where: { authUserId }, select: { id: true } });
  if (!profile) fail("AUTH_REQUIRED", 401);
  const team = await db.fantasyTeam.findFirst({ where: { leagueId, userProfileId: profile.id, league: { status: "ACTIVE", memberships: { some: { userProfileId: profile.id, status: "ACTIVE" } } } }, select: { id: true, rosterRuleSet: { select: { rosterSize: true } }, _count: { select: { rosterSlots: true } } } });
  if (!team) fail("TEAM_NOT_FOUND", 404);
  const setting = await marketV2State();
  if (!setting.active) return { active: false as const, cycle: null, listings: [], history: [] };
  const cycle = await advanceMarketV2(leagueId);
  const listings = cycle ? await db.marketV2Listing.findMany({ where: { cycleId: cycle.id }, include: { bids: { where: { fantasyTeamId: team.id }, select: { amountCredits: true, status: true } } }, orderBy: { createdAt: "asc" } }) : [];
  const [history, activeBids, activeOffers] = await Promise.all([
    db.marketV2Listing.findMany({ where: { leagueId, cycle: { status: "SETTLED" } }, include: { bids: { include: { fantasyTeam: { include: { userProfile: { select: { username: true, displayName: true } } } } } } }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.marketV2Bid.findMany({ where: { fantasyTeamId: team.id, status: "ACTIVE" }, select: { amountCredits: true } }),
    db.marketOfferProposal.findMany({ where: { proposerTeamId: team.id, status: "ACTIVE", expiresAt: { gt: new Date() }, thread: { buyerTeamId: team.id, status: "OPEN" } }, select: { amountCredits: true } }),
  ]);
  return { active: true as const, cycle: cycle ? { id: cycle.id, opensAt: cycle.opensAt.toISOString(), closesAt: cycle.closesAt.toISOString() } : null, reservedCredits: Number(activeBids.reduce((sum, bid) => sum + bid.amountCredits, 0n)), reservedSlots: activeBids.length, reservedOfferCredits: Number(activeOffers.reduce((sum, offer) => sum + offer.amountCredits, 0n)), reservedOfferSlots: activeOffers.length, rosterCount: team._count.rosterSlots, rosterSize: team.rosterRuleSet.rosterSize, listings: listings.map(x => ({ id: x.id, playerRegistrationId: x.playerRegistrationId, referencePrice: Number(x.referencePrice), myBid: x.bids[0] ? { amountCredits: Number(x.bids[0].amountCredits), status: x.bids[0].status } : null })), history: history.map(x => projectMarketResult(x.playerRegistrationId, x.bids, team.id)) };
}

export async function submitMarketV2Bid(authUserId: string, input: { leagueId: string; listingId: string; amountCredits?: number; action: "BID" | "CANCEL"; idempotencyKey: string }) {
  if (!input || !/^[0-9a-f-]{36}$/i.test(input.leagueId) || !/^[0-9a-f-]{36}$/i.test(input.listingId) || !["BID", "CANCEL"].includes(input.action) || typeof input.idempotencyKey !== "string" || !input.idempotencyKey || input.idempotencyKey.length > 100 || (input.action === "BID" && (!Number.isSafeInteger(input.amountCredits) || input.amountCredits! <= 0))) fail("INVALID_INPUT", 422);
  const profile = await db.userProfile.findUnique({ where: { authUserId }, select: { id: true } });
  if (!profile) fail("AUTH_REQUIRED", 401);
  const team = await db.fantasyTeam.findFirst({ where: { leagueId: input.leagueId, userProfileId: profile.id, league: { status: "ACTIVE", memberships: { some: { userProfileId: profile.id, status: "ACTIVE" } } } }, include: { rosterRuleSet: true } });
  if (!team) fail("TEAM_NOT_FOUND", 404);
  await advanceMarketV2(input.leagueId);
  const result = await serializable(async tx => {
    await requireFantasyCompetition(tx, team.competitionSeasonId);
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.leagueId}))`);
    const prior = await tx.marketV2Request.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (prior) {
      if (prior.fantasyTeamId !== team.id || prior.listingId !== input.listingId || prior.action !== input.action || prior.amountCredits !== (input.action === "BID" ? BigInt(input.amountCredits!) : null)) fail("INVALID_INPUT", 422);
      return { bidId: prior.bidId, status: prior.resultStatus, replayed: true };
    }
    const listing = await tx.marketV2Listing.findUnique({ where: { id: input.listingId }, include: { cycle: true } });
    const now = new Date();
    if (!listing || listing.leagueId !== input.leagueId || listing.status !== "OPEN" || listing.cycle.status !== "OPEN" || listing.cycle.closesAt <= now || listing.cycle.opensAt > now) fail("BIDDING_CLOSED");
    if (await tx.fantasyRosterSlot.findUnique({ where: { leagueId_playerRegistrationId: { leagueId: input.leagueId, playerRegistrationId: listing.playerRegistrationId } }, select: { id: true } })) fail("PLAYER_OWNED");
    const existing = await tx.marketV2Bid.findUnique({ where: { listingId_fantasyTeamId: { listingId: listing.id, fantasyTeamId: team.id } } });
    if (input.action === "CANCEL") { if (!existing || existing.status !== "ACTIVE") fail("BID_NOT_FOUND", 404); const bid = await tx.marketV2Bid.update({ where: { id: existing.id }, data: { status: "CANCELLED" } }); await tx.marketV2Request.create({ data: { idempotencyKey: input.idempotencyKey, listingId: listing.id, fantasyTeamId: team.id, action: "CANCEL", bidId: bid.id, resultStatus: bid.status } }); return { bidId: bid.id, status: bid.status }; }
    const amount = BigInt(input.amountCredits!);
    if (amount < listing.referencePrice) fail("BID_BELOW_REFERENCE", 422);
    const currentTeam = await tx.fantasyTeam.findUniqueOrThrow({ where: { id: team.id }, include: { rosterRuleSet: true } });
    const [activeBids, activeOffers, rosterCount, player] = await Promise.all([
      tx.marketV2Bid.findMany({ where: { fantasyTeamId: team.id, status: "ACTIVE", id: existing ? { not: existing.id } : undefined }, select: { amountCredits: true, listing: { select: { playerRegistration: { select: { teamRegistrationId: true } } } } } }),
      activeOfferReservations(tx, team.id),
      tx.fantasyRosterSlot.count({ where: { fantasyTeamId: team.id } }),
      tx.playerRegistration.findUnique({ where: { id: listing.playerRegistrationId }, select: { teamRegistrationId: true } }),
    ]);
    if (!player) fail("PLAYER_NOT_FOUND", 404);
    const reserved = activeBids.reduce((sum, b) => sum + b.amountCredits, 0n);
    if (currentTeam.balanceCredits === null || reserved + activeOffers.amount + amount > currentTeam.balanceCredits) fail("INSUFFICIENT_BALANCE");
    if (rosterCount + activeBids.length + activeOffers.count + 1 > currentTeam.rosterRuleSet.rosterSize) fail("ROSTER_FULL");
    const sameRoster = await tx.fantasyRosterSlot.count({ where: { fantasyTeamId: team.id, playerRegistration: { teamRegistrationId: player.teamRegistrationId } } });
    const sameBids = activeBids.filter(b => b.listing.playerRegistration.teamRegistrationId === player.teamRegistrationId).length;
    const sameOffers = activeOffers.teamIds.filter(id => id === player.teamRegistrationId).length;
    if (sameRoster + sameBids + sameOffers + 1 > currentTeam.rosterRuleSet.maxPerRealTeam) fail("REAL_TEAM_LIMIT");
    const bid = existing ? await tx.marketV2Bid.update({ where: { id: existing.id }, data: { amountCredits: amount, status: "ACTIVE", bidAt: now } }) : await tx.marketV2Bid.create({ data: { listingId: listing.id, fantasyTeamId: team.id, amountCredits: amount, bidAt: now } });
    await tx.marketV2Request.create({ data: { idempotencyKey: input.idempotencyKey, listingId: listing.id, fantasyTeamId: team.id, action: "BID", amountCredits: amount, bidId: bid.id, resultStatus: bid.status } });
    return { bidId: bid.id, status: bid.status, amountCredits: Number(bid.amountCredits) };
  });
  invalidateCache(cacheTags({ leagueId: input.leagueId }));
  return result;
}

export async function advanceAllMarketV2(now = new Date()) {
  const leagues = await db.fantasyLeague.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  for (const league of leagues) await advanceMarketV2(league.id, now);
  return { processed: leagues.length };
}

export async function cancelCompetitionMarketV2(tx: Tx, competitionSeasonId: string, now = new Date()) {
  const cycles = await tx.marketV2Cycle.findMany({ where: { status: "OPEN", league: { competitionSeasonId } }, select: { id: true } });
  for (const cycle of cycles) await cancelCycle(tx, cycle.id, now);
}
export async function cancelLeagueMarketV2(tx: Tx, leagueId: string, now = new Date()) {
  const cycles = await tx.marketV2Cycle.findMany({ where: { leagueId, status: "OPEN" }, select: { id: true } });
  for (const cycle of cycles) await cancelCycle(tx, cycle.id, now);
}
