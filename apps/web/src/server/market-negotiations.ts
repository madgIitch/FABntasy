import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PLAYER_PRICING_V1 } from "../../../../packages/domain/player-pricing";
import { db } from "./db";
import { invalidatePlayerNegotiations } from "./market-offer-invalidation";
import { activeOfferReservations } from "./market-reservations";
import { advanceMarketV2, currentMarketMidnight } from "./market-v2";
import { cacheTags, invalidateCache } from "./performance";
import { enqueuePushEvent, wakePushWorker } from "./push-outbox";
import { appendLeagueEvent } from "./social-league";
import { requireAvailableLeagueSeason, requireSelectedSeason, selectedSeasonIds } from "./league-competition-seasons";

type Tx = Prisma.TransactionClient;
const HOUR = 60 * 60 * 1000;
const offerLifetime = 48 * HOUR;
const listingLifetime = 72 * HOUR;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class MarketNegotiationError extends Error { constructor(public code: string, public status = 409, public details?: Record<string, unknown>) { super(code); } }
function fail(code: string, status = 409, details?: Record<string, unknown>): never { throw new MarketNegotiationError(code, status, details); }
async function serializable<T>(body: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(body, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 }); }
    catch (error) { if ((error as { code?: string }).code !== "P2034" || attempt === 2) throw error; }
  }
  throw new Error("NEGOTIATION_RETRY_EXHAUSTED");
}
async function lockLeague(tx: Tx, leagueId: string) { await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${leagueId}))`); }
async function actorTeam(tx: Tx, authUserId: string, leagueId: string) {
  const profile = await tx.userProfile.findUnique({ where: { authUserId }, select: { id: true } });
  if (!profile) fail("AUTH_REQUIRED", 401);
  const team = await tx.fantasyTeam.findFirst({ where: { leagueId, userProfileId: profile.id, league: { status: "ACTIVE", memberships: { some: { userProfileId: profile.id, status: "ACTIVE" } } } }, include: { rosterRuleSet: true } });
  if (!team) fail("TEAM_NOT_FOUND", 404);
  await requireAvailableLeagueSeason(tx, leagueId);
  if (team.balanceCredits === null) fail("BALANCE_UNAVAILABLE");
  return { profile, team };
}
async function playerSeason(tx: Tx, playerRegistrationId: string, leagueId: string) {
  const player = await tx.playerRegistration.findUnique({ where: { id: playerRegistrationId }, select: { competitionSeasonId: true } });
  if (!player || !await requireSelectedSeason(tx, leagueId, player.competitionSeasonId)) fail("PLAYER_NOT_FOUND", 404);
  return player.competitionSeasonId;
}
async function currentPrice(tx: Tx, playerRegistrationId: string, leagueId: string) {
  const competitionSeasonId = await playerSeason(tx, playerRegistrationId, leagueId);
  const row = await tx.playerPrice.findFirst({ where: { playerRegistrationId, competitionSeasonId }, orderBy: { updatedAt: "desc" }, select: { currentPrice: true } });
  return row?.currentPrice ?? BigInt(PLAYER_PRICING_V1.initialPrice);
}
async function priceAt(tx: Tx, playerRegistrationId: string, leagueId: string, at: Date) {
  const competitionSeasonId = await playerSeason(tx, playerRegistrationId, leagueId);
  const row = await tx.playerPrice.findFirst({ where: { playerRegistrationId, competitionSeasonId }, orderBy: { updatedAt: "desc" }, select: { currentPrice: true, updatedAt: true } });
  if (!row || row.updatedAt <= at) return row?.currentPrice ?? BigInt(PLAYER_PRICING_V1.initialPrice);
  const before = await tx.playerPriceEvent.findFirst({ where: { playerRegistrationId, competitionSeasonId, createdAt: { lte: at } }, orderBy: { createdAt: "desc" }, select: { newPrice: true } });
  if (before) return before.newPrice;
  const after = await tx.playerPriceEvent.findFirst({ where: { playerRegistrationId, competitionSeasonId, createdAt: { gt: at } }, orderBy: { createdAt: "asc" }, select: { previousPrice: true } });
  return after?.previousPrice ?? BigInt(PLAYER_PRICING_V1.initialPrice);
}
export function instantSaleQuote(price: bigint) { return (price * 80n + 50n) / 100n; }
function payloadHash(input: NegotiationInput) { return createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(input).filter(([key]) => key !== "idempotencyKey").sort(([a], [b]) => a.localeCompare(b))))).digest("hex"); }
async function saveRequest(tx: Tx, input: NegotiationInput, actorTeamId: string, result: Record<string, unknown>) {
  await tx.marketNegotiationRequest.create({ data: { idempotencyKey: input.idempotencyKey, actorTeamId, action: input.action, payloadHash: payloadHash(input), result: result as Prisma.InputJsonValue } });
  return result;
}
async function validateBuyer(tx: Tx, team: { id: string; leagueId: string; balanceCredits: bigint | null; rosterRuleSet: { rosterSize: number; maxPerRealTeam: number } }, playerRegistrationId: string, amount: bigint, excludeProposalId?: string) {
  const now = new Date();
  const [bids, offers, rosterCount, player] = await Promise.all([
    tx.marketV2Bid.findMany({ where: { fantasyTeamId: team.id, status: "ACTIVE", listing: { cycle: { status: "OPEN", closesAt: { gt: now } } } }, select: { amountCredits: true, listing: { select: { playerRegistration: { select: { teamRegistrationId: true } } } } } }),
    activeOfferReservations(tx, team.id, now, excludeProposalId),
    tx.fantasyRosterSlot.count({ where: { fantasyTeamId: team.id } }),
    tx.playerRegistration.findUnique({ where: { id: playerRegistrationId }, select: { teamRegistrationId: true, competitionSeasonId: true, identityStatus: true } }),
  ]);
  if (!player || player.identityStatus === "CONFLICT" || !await requireSelectedSeason(tx, team.leagueId, player.competitionSeasonId)) fail("PLAYER_NOT_FOUND", 404);
  const bidAmount = bids.reduce((sum, bid) => sum + bid.amountCredits, 0n);
  if (team.balanceCredits === null || bidAmount + offers.amount + amount > team.balanceCredits) fail("INSUFFICIENT_BALANCE");
  if (rosterCount + bids.length + offers.count + 1 > team.rosterRuleSet.rosterSize) fail("ROSTER_FULL");
  const sameRoster = await tx.fantasyRosterSlot.count({ where: { fantasyTeamId: team.id, playerRegistration: { teamRegistrationId: player.teamRegistrationId } } });
  const sameBids = bids.filter(bid => bid.listing.playerRegistration.teamRegistrationId === player.teamRegistrationId).length;
  const sameOffers = offers.teamIds.filter(id => id === player.teamRegistrationId).length;
  if (sameRoster + sameBids + sameOffers + 1 > team.rosterRuleSet.maxPerRealTeam) fail("REAL_TEAM_LIMIT");
}

export async function advanceMarketNegotiations(leagueId: string, now = new Date()) {
  await advanceMarketV2(leagueId, now);
  const result = await serializable(async tx => {
    await lockLeague(tx, leagueId);
    const league = await tx.fantasyLeague.findUnique({ where: { id: leagueId }, select: { status: true, competitionSeasonId: true, competitionSeason: { select: { fantasyEnabled: true } } } });
    if (!league || league.status !== "ACTIVE") return { generated: 0 };
    const available = await tx.competitionSeason.findFirst({ where: { id: { in: await selectedSeasonIds(tx, leagueId) }, fantasyEnabled: true }, select: { id: true } });
    if (!available) return { generated: 0 };
    const expired = await tx.marketOfferProposal.findMany({ where: { status: "ACTIVE", expiresAt: { lte: now }, thread: { leagueId, status: "OPEN" } }, select: { id: true, threadId: true } });
    await tx.marketOfferProposal.updateMany({ where: { id: { in: expired.map(item => item.id) } }, data: { status: "EXPIRED" } });
    await tx.marketOfferThread.updateMany({ where: { id: { in: expired.map(item => item.threadId) }, status: "OPEN" }, data: { status: "EXPIRED" } });
    const endedListings = await tx.marketTransferListing.findMany({ where: { leagueId, status: "OPEN", expiresAt: { lte: now } }, select: { id: true } });
    await tx.marketTransferListing.updateMany({ where: { id: { in: endedListings.map(item => item.id) } }, data: { status: "EXPIRED" } });
    await tx.marketSystemOffer.updateMany({ where: { listingId: { in: endedListings.map(item => item.id) }, status: "ACTIVE" }, data: { status: "EXPIRED" } });
    await tx.marketSystemOffer.updateMany({ where: { listing: { leagueId }, status: "ACTIVE", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
    const cycle = await tx.marketV2Cycle.findFirst({ where: { leagueId, status: "OPEN", opensAt: { lte: now }, closesAt: { gt: now } }, orderBy: { opensAt: "desc" } });
    if (!cycle) return { generated: 0 };
    if (cycle.opensAt.getTime() !== currentMarketMidnight(cycle.opensAt).getTime()) return { generated: 0 };
    const listings = await tx.marketTransferListing.findMany({ where: { leagueId, status: "OPEN", listedAt: { lt: cycle.opensAt }, expiresAt: { gt: now } } });
    let generated = 0;
    for (const listing of listings) {
      const exists = await tx.marketSystemOffer.findUnique({ where: { listingId_cycleId: { listingId: listing.id, cycleId: cycle.id } }, select: { id: true } });
      if (exists) continue;
      const owner = await tx.fantasyRosterSlot.findUnique({ where: { leagueId_playerRegistrationId: { leagueId, playerRegistrationId: listing.playerRegistrationId } }, select: { fantasyTeamId: true } });
      if (!owner || owner.fantasyTeamId !== listing.sellerTeamId) { await invalidatePlayerNegotiations(tx, leagueId, listing.playerRegistrationId); continue; }
      const registration = await tx.playerRegistration.findUnique({ where: { id: listing.playerRegistrationId }, select: { competitionSeason: { select: { fantasyEnabled: true } } } });
      if (!registration?.competitionSeason.fantasyEnabled) continue;
      const amountCredits = await priceAt(tx, listing.playerRegistrationId, leagueId, cycle.opensAt);
      const offer = await tx.marketSystemOffer.create({ data: { listingId: listing.id, cycleId: cycle.id, amountCredits, expiresAt: new Date(Math.min(cycle.closesAt.getTime(), listing.expiresAt.getTime())) } });
      const seller = await tx.fantasyTeam.findUniqueOrThrow({ where: { id: listing.sellerTeamId }, select: { userProfileId: true } });
      await enqueuePushEvent(tx, { userProfileId: seller.userProfileId, leagueId, intent: "MARKET_SOLD", eventKey: `system-offer:${offer.id}`, title: "Oferta de Canastio", body: "Tienes una oferta por un jugador en venta.", destination: "/app/mercado?view=explore" });
      generated++;
    }
    return { generated };
  });
  if (result.generated) { invalidateCache(cacheTags({ leagueId })); void wakePushWorker(); }
  return result;
}

export async function advanceAllMarketNegotiations(now = new Date()) {
  const leagues = await db.fantasyLeague.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  for (const league of leagues) await advanceMarketNegotiations(league.id, now);
  return { processed: leagues.length };
}

export async function getMarketNegotiationsForActor(authUserId: string, leagueId: string) {
  if (!uuid.test(leagueId)) fail("INVALID_INPUT", 422);
  await advanceMarketNegotiations(leagueId);
  const profile = await db.userProfile.findUnique({ where: { authUserId }, select: { id: true } });
  if (!profile) fail("AUTH_REQUIRED", 401);
  const team = await db.fantasyTeam.findFirst({ where: { leagueId, userProfileId: profile.id, league: { status: "ACTIVE", memberships: { some: { userProfileId: profile.id, status: "ACTIVE" } } } }, select: { id: true, competitionSeasonId: true } });
  if (!team) fail("TEAM_NOT_FOUND", 404);
  const [listings, threads, ownSlots, reservedOffers] = await Promise.all([
    db.marketTransferListing.findMany({ where: { leagueId, status: "OPEN", expiresAt: { gt: new Date() } }, include: { sellerTeam: { include: { userProfile: { select: { username: true, displayName: true } } } }, systemOffers: { where: { status: "ACTIVE", expiresAt: { gt: new Date() } }, select: { id: true, amountCredits: true, expiresAt: true } } }, orderBy: { listedAt: "desc" } }),
    db.marketOfferThread.findMany({ where: { leagueId, OR: [{ buyerTeamId: team.id }, { sellerTeamId: team.id }] }, include: { buyerTeam: { include: { userProfile: { select: { username: true, displayName: true } } } }, sellerTeam: { include: { userProfile: { select: { username: true, displayName: true } } } }, proposals: { orderBy: { createdAt: "desc" } } }, orderBy: { updatedAt: "desc" }, take: 60 }),
    db.fantasyRosterSlot.findMany({ where: { fantasyTeamId: team.id }, select: { playerRegistrationId: true } }),
    db.marketOfferProposal.findMany({ where: { proposerTeamId: team.id, status: "ACTIVE", expiresAt: { gt: new Date() }, thread: { buyerTeamId: team.id, status: "OPEN" } }, select: { amountCredits: true } }),
  ]);
  const prices = await db.playerPrice.findMany({ where: { playerRegistrationId: { in: ownSlots.map(slot => slot.playerRegistrationId) } }, orderBy: { updatedAt: "desc" }, select: { playerRegistrationId: true, currentPrice: true } });
  const quoteByPlayer = new Map<string, bigint>();
  for (const price of prices) if (!quoteByPlayer.has(price.playerRegistrationId)) quoteByPlayer.set(price.playerRegistrationId, price.currentPrice);
  return {
    teamId: team.id,
    reservedOfferCredits: Number(reservedOffers.reduce((sum, offer) => sum + offer.amountCredits, 0n)),
    listings: listings.map(item => ({ id: item.id, playerRegistrationId: item.playerRegistrationId, sellerTeamId: item.sellerTeamId, seller: item.sellerTeam.userProfile.username ?? item.sellerTeam.userProfile.displayName ?? "Manager", desiredPriceCredits: item.desiredPriceCredits === null ? null : Number(item.desiredPriceCredits), expiresAt: item.expiresAt.toISOString(), mine: item.sellerTeamId === team.id, systemOffer: item.sellerTeamId === team.id && item.systemOffers[0] ? { id: item.systemOffers[0].id, amountCredits: Number(item.systemOffers[0].amountCredits), expiresAt: item.systemOffers[0].expiresAt.toISOString() } : null })),
    threads: threads.map(item => ({ id: item.id, playerRegistrationId: item.playerRegistrationId, buyerTeamId: item.buyerTeamId, sellerTeamId: item.sellerTeamId, status: item.status, buyer: item.buyerTeam.userProfile.username ?? item.buyerTeam.userProfile.displayName ?? "Manager", seller: item.sellerTeam.userProfile.username ?? item.sellerTeam.userProfile.displayName ?? "Manager", proposals: item.proposals.map(proposal => ({ id: proposal.id, proposerTeamId: proposal.proposerTeamId, amountCredits: Number(proposal.amountCredits), status: proposal.status, expiresAt: proposal.expiresAt.toISOString() })) })),
    instantQuotes: ownSlots.map(slot => ({ playerRegistrationId: slot.playerRegistrationId, amountCredits: Number(instantSaleQuote(quoteByPlayer.get(slot.playerRegistrationId) ?? BigInt(PLAYER_PRICING_V1.initialPrice))) })),
  };
}

export type NegotiationInput = { leagueId: string; action: "LIST" | "UNLIST" | "OFFER" | "COUNTER" | "ACCEPT" | "REJECT" | "ACCEPT_SYSTEM" | "INSTANT_SELL"; idempotencyKey: string; playerRegistrationId?: string; listingId?: string; threadId?: string; systemOfferId?: string; amountCredits?: number; desiredPriceCredits?: number | null; expectedQuoteCredits?: number };

async function notify(tx: Tx, teamId: string, leagueId: string, key: string, title: string) {
  const team = await tx.fantasyTeam.findUniqueOrThrow({ where: { id: teamId }, select: { userProfileId: true } });
  await enqueuePushEvent(tx, { userProfileId: team.userProfileId, leagueId, intent: "MARKET_SOLD", eventKey: key, title, body: "Consulta la operación en el mercado.", destination: "/app/mercado?view=explore" });
}

async function transfer(tx: Tx, params: { leagueId: string; playerRegistrationId: string; sellerTeamId: string; buyerTeamId?: string; amount: bigint; idempotencyKey: string; transactionType: string; actorProfileId: string }) {
  const { leagueId, playerRegistrationId, sellerTeamId, buyerTeamId, amount, idempotencyKey, transactionType, actorProfileId } = params;
  const slot = await tx.fantasyRosterSlot.findUnique({ where: { leagueId_playerRegistrationId: { leagueId, playerRegistrationId } }, select: { id: true, fantasyTeamId: true } });
  if (!slot || slot.fantasyTeamId !== sellerTeamId) fail("OWNER_CHANGED");
  const seller = await tx.fantasyTeam.findUniqueOrThrow({ where: { id: sellerTeamId }, select: { balanceCredits: true, competitionSeasonId: true } });
  if (seller.balanceCredits === null) fail("BALANCE_UNAVAILABLE");
  const price = await currentPrice(tx, playerRegistrationId, leagueId);
  const transaction = await tx.marketTransaction.create({ data: { leagueId, playerRegistrationId, buyerTeamId, sellerTeamId, transactionType, priceCredits: amount, marketPriceCredits: price, idempotencyKey } });
  await tx.fantasyRosterSlot.delete({ where: { id: slot.id } });
  const sellerBalance = seller.balanceCredits + amount;
  await tx.fantasyTeam.update({ where: { id: sellerTeamId }, data: { balanceCredits: sellerBalance, version: { increment: 1 } } });
  await tx.fantasyBudgetLedgerEntry.create({ data: { fantasyTeamId: sellerTeamId, leagueId, transactionId: transaction.id, entryType: transactionType === "INSTANT_SELL" ? "INSTANT_SALE" : "SALE_RECEIVED", amountCredits: amount, balanceAfter: sellerBalance } });
  if (buyerTeamId) {
    const buyer = await tx.fantasyTeam.findUniqueOrThrow({ where: { id: buyerTeamId }, select: { balanceCredits: true, competitionSeasonId: true } });
    if (buyer.balanceCredits === null || buyer.balanceCredits < amount) fail("INSUFFICIENT_BALANCE");
    const buyerBalance = buyer.balanceCredits - amount;
    await tx.fantasyRosterSlot.create({ data: { fantasyTeamId: buyerTeamId, leagueId, playerRegistrationId, acquisitionPrice: amount } });
    await tx.fantasyTeam.update({ where: { id: buyerTeamId }, data: { balanceCredits: buyerBalance, version: { increment: 1 } } });
    await tx.fantasyBudgetLedgerEntry.create({ data: { fantasyTeamId: buyerTeamId, leagueId, transactionId: transaction.id, entryType: "OFFER_PAID", amountCredits: -amount, balanceAfter: buyerBalance } });
    const next = await tx.game.findFirst({ where: { competitionSeasonId: buyer.competitionSeasonId, scheduledAt: { gt: new Date() }, roundNumber: { not: null } }, orderBy: { scheduledAt: "asc" }, select: { scheduledAt: true, roundNumber: true } });
    if (next?.scheduledAt) await tx.marketProtection.create({ data: { leagueId, fantasyTeamId: buyerTeamId, playerRegistrationId, protectionType: "NEW_SIGNING", roundNumber: next.roundNumber!, protectedUntil: next.scheduledAt } });
  }
  const player = await tx.playerRegistration.findUnique({ where: { id: playerRegistrationId }, select: { player: { select: { displayName: true } } } });
  await appendLeagueEvent(tx, { leagueId, type: buyerTeamId ? "PLAYER_BOUGHT" : "PLAYER_SOLD", actorProfileId, sourceType: "MARKET_TRANSACTION", sourceId: transaction.id, payload: { affectedName: player?.player.displayName ?? "Jugador", magnitude: Number(amount), unit: "credits", destination: "/app/mercado?view=explore" } });
  await notify(tx, sellerTeamId, leagueId, `negotiation:${transaction.id}:seller`, "Venta completada");
  if (buyerTeamId) await notify(tx, buyerTeamId, leagueId, `negotiation:${transaction.id}:buyer`, "Fichaje completado");
  return transaction;
}

export async function executeMarketNegotiation(authUserId: string, input: NegotiationInput) {
  if (!input || !uuid.test(input.leagueId) || typeof input.idempotencyKey !== "string" || !input.idempotencyKey || input.idempotencyKey.length > 100 || !["LIST", "UNLIST", "OFFER", "COUNTER", "ACCEPT", "REJECT", "ACCEPT_SYSTEM", "INSTANT_SELL"].includes(input.action)) fail("INVALID_INPUT", 422);
  if (input.playerRegistrationId && !uuid.test(input.playerRegistrationId)) fail("INVALID_INPUT", 422);
  if (input.listingId && !uuid.test(input.listingId)) fail("INVALID_INPUT", 422);
  if (input.threadId && !uuid.test(input.threadId)) fail("INVALID_INPUT", 422);
  if (input.systemOfferId && !uuid.test(input.systemOfferId)) fail("INVALID_INPUT", 422);
  if (input.amountCredits !== undefined && (!Number.isSafeInteger(input.amountCredits) || input.amountCredits <= 0)) fail("INVALID_INPUT", 422);
  if (input.desiredPriceCredits !== undefined && input.desiredPriceCredits !== null && (!Number.isSafeInteger(input.desiredPriceCredits) || input.desiredPriceCredits <= 0)) fail("INVALID_INPUT", 422);
  if (input.expectedQuoteCredits !== undefined && (!Number.isSafeInteger(input.expectedQuoteCredits) || input.expectedQuoteCredits <= 0)) fail("INVALID_INPUT", 422);
  await advanceMarketNegotiations(input.leagueId);
  const result = await serializable(async tx => {
    await lockLeague(tx, input.leagueId);
    const { profile, team } = await actorTeam(tx, authUserId, input.leagueId);
    const prior = await tx.marketNegotiationRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (prior) {
      if (prior.actorTeamId !== team.id || prior.action !== input.action || prior.payloadHash !== payloadHash(input)) fail("IDEMPOTENCY_CONFLICT", 422);
      return { ...(prior.result as Record<string, unknown>), replayed: true };
    }
    const now = new Date();
    let response: Record<string, unknown>;

    if (input.action === "LIST") {
      if (!input.playerRegistrationId) fail("INVALID_INPUT", 422);
      await playerSeason(tx, input.playerRegistrationId, input.leagueId);
      const owner = await tx.fantasyRosterSlot.findUnique({ where: { leagueId_playerRegistrationId: { leagueId: input.leagueId, playerRegistrationId: input.playerRegistrationId } }, select: { fantasyTeamId: true } });
      if (owner?.fantasyTeamId !== team.id) fail("NOT_OWNER");
      const existing = await tx.marketTransferListing.findFirst({ where: { leagueId: input.leagueId, playerRegistrationId: input.playerRegistrationId, status: "OPEN", expiresAt: { gt: now } } });
      if (existing) fail("ALREADY_LISTED");
      const listing = await tx.marketTransferListing.create({ data: { leagueId: input.leagueId, playerRegistrationId: input.playerRegistrationId, sellerTeamId: team.id, desiredPriceCredits: input.desiredPriceCredits == null ? null : BigInt(input.desiredPriceCredits), listedAt: now, expiresAt: new Date(now.getTime() + listingLifetime) } });
      response = { listingId: listing.id, status: listing.status, expiresAt: listing.expiresAt.toISOString() };
    } else if (input.action === "UNLIST") {
      if (!input.listingId) fail("INVALID_INPUT", 422);
      const listing = await tx.marketTransferListing.findUnique({ where: { id: input.listingId } });
      if (!listing || listing.leagueId !== input.leagueId || listing.sellerTeamId !== team.id || listing.status !== "OPEN") fail("LISTING_NOT_FOUND", 404);
      await tx.marketTransferListing.update({ where: { id: listing.id }, data: { status: "CANCELLED" } });
      await tx.marketSystemOffer.updateMany({ where: { listingId: listing.id, status: "ACTIVE" }, data: { status: "INVALID" } });
      response = { listingId: listing.id, status: "CANCELLED" };
    } else if (input.action === "OFFER") {
      if (!input.playerRegistrationId || input.amountCredits === undefined) fail("INVALID_INPUT", 422);
      const owner = await tx.fantasyRosterSlot.findUnique({ where: { leagueId_playerRegistrationId: { leagueId: input.leagueId, playerRegistrationId: input.playerRegistrationId } }, select: { fantasyTeamId: true } });
      if (!owner || owner.fantasyTeamId === team.id) fail("PLAYER_NOT_ELIGIBLE");
      const existing = await tx.marketOfferThread.findFirst({ where: { leagueId: input.leagueId, playerRegistrationId: input.playerRegistrationId, buyerTeamId: team.id, sellerTeamId: owner.fantasyTeamId, status: "OPEN" }, include: { proposals: { where: { status: "ACTIVE" }, take: 1 } } });
      if (existing?.proposals[0]?.proposerTeamId === owner.fantasyTeamId) fail("RESPOND_TO_COUNTER");
      await validateBuyer(tx, team, input.playerRegistrationId, BigInt(input.amountCredits), existing?.proposals[0]?.id);
      const listing = await tx.marketTransferListing.findFirst({ where: { leagueId: input.leagueId, playerRegistrationId: input.playerRegistrationId, sellerTeamId: owner.fantasyTeamId, status: "OPEN", expiresAt: { gt: now } }, select: { id: true } });
      const thread = existing ?? await tx.marketOfferThread.create({ data: { leagueId: input.leagueId, playerRegistrationId: input.playerRegistrationId, buyerTeamId: team.id, sellerTeamId: owner.fantasyTeamId, listingId: listing?.id } });
      if (existing?.proposals[0]) await tx.marketOfferProposal.update({ where: { id: existing.proposals[0].id }, data: { status: "SUPERSEDED" } });
      const proposal = await tx.marketOfferProposal.create({ data: { threadId: thread.id, proposerTeamId: team.id, amountCredits: BigInt(input.amountCredits), expiresAt: new Date(now.getTime() + offerLifetime) } });
      await notify(tx, owner.fantasyTeamId, input.leagueId, `negotiation:${proposal.id}`, "Nueva oferta privada");
      response = { threadId: thread.id, proposalId: proposal.id, status: "ACTIVE", expiresAt: proposal.expiresAt.toISOString() };
    } else if (["COUNTER", "ACCEPT", "REJECT"].includes(input.action)) {
      if (!input.threadId) fail("INVALID_INPUT", 422);
      const thread = await tx.marketOfferThread.findUnique({ where: { id: input.threadId }, include: { proposals: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 } } });
      if (!thread || thread.leagueId !== input.leagueId || thread.status !== "OPEN" || ![thread.buyerTeamId, thread.sellerTeamId].includes(team.id)) fail("THREAD_NOT_FOUND", 404);
      const current = thread.proposals[0];
      if (!current || current.expiresAt <= now) fail("OFFER_EXPIRED");
      if (current.proposerTeamId === team.id) fail("NOT_RECIPIENT");
      const owner = await tx.fantasyRosterSlot.findUnique({ where: { leagueId_playerRegistrationId: { leagueId: input.leagueId, playerRegistrationId: thread.playerRegistrationId } }, select: { fantasyTeamId: true } });
      if (owner?.fantasyTeamId !== thread.sellerTeamId) fail("OWNER_CHANGED");
      if (input.action === "COUNTER") {
        if (input.amountCredits === undefined) fail("INVALID_INPUT", 422);
        if (team.id === thread.buyerTeamId) await validateBuyer(tx, team, thread.playerRegistrationId, BigInt(input.amountCredits));
        await tx.marketOfferProposal.update({ where: { id: current.id }, data: { status: "SUPERSEDED" } });
        const proposal = await tx.marketOfferProposal.create({ data: { threadId: thread.id, proposerTeamId: team.id, amountCredits: BigInt(input.amountCredits), expiresAt: new Date(now.getTime() + offerLifetime) } });
        await notify(tx, current.proposerTeamId, input.leagueId, `negotiation:${proposal.id}`, "Nueva contraoferta");
        response = { threadId: thread.id, proposalId: proposal.id, status: "ACTIVE", expiresAt: proposal.expiresAt.toISOString() };
      } else if (input.action === "REJECT") {
        await tx.marketOfferProposal.update({ where: { id: current.id }, data: { status: "REJECTED" } });
        await tx.marketOfferThread.update({ where: { id: thread.id }, data: { status: "REJECTED" } });
        await notify(tx, current.proposerTeamId, input.leagueId, `negotiation:${current.id}:rejected`, "Oferta rechazada");
        response = { threadId: thread.id, status: "REJECTED" };
      } else {
        const buyer = await tx.fantasyTeam.findUniqueOrThrow({ where: { id: thread.buyerTeamId }, include: { rosterRuleSet: true } });
        await validateBuyer(tx, buyer, thread.playerRegistrationId, current.amountCredits, current.proposerTeamId === buyer.id ? current.id : undefined);
        const transaction = await transfer(tx, { leagueId: input.leagueId, playerRegistrationId: thread.playerRegistrationId, sellerTeamId: thread.sellerTeamId, buyerTeamId: buyer.id, amount: current.amountCredits, idempotencyKey: input.idempotencyKey, transactionType: "MANAGER_OFFER", actorProfileId: profile.id });
        await tx.marketOfferProposal.update({ where: { id: current.id }, data: { status: "ACCEPTED", transactionId: transaction.id } });
        await tx.marketOfferThread.update({ where: { id: thread.id }, data: { status: "ACCEPTED" } });
        await invalidatePlayerNegotiations(tx, input.leagueId, thread.playerRegistrationId);
        response = { threadId: thread.id, transactionId: transaction.id, status: "ACCEPTED" };
      }
    } else if (input.action === "ACCEPT_SYSTEM") {
      if (!input.systemOfferId) fail("INVALID_INPUT", 422);
      const offer = await tx.marketSystemOffer.findUnique({ where: { id: input.systemOfferId }, include: { listing: true } });
      if (!offer || offer.listing.leagueId !== input.leagueId || offer.listing.sellerTeamId !== team.id || offer.status !== "ACTIVE" || offer.expiresAt <= now || offer.listing.status !== "OPEN" || offer.listing.expiresAt <= now) fail("SYSTEM_OFFER_EXPIRED");
      const transaction = await transfer(tx, { leagueId: input.leagueId, playerRegistrationId: offer.listing.playerRegistrationId, sellerTeamId: team.id, amount: offer.amountCredits, idempotencyKey: input.idempotencyKey, transactionType: "SYSTEM_OFFER", actorProfileId: profile.id });
      await tx.marketSystemOffer.update({ where: { id: offer.id }, data: { status: "ACCEPTED", transactionId: transaction.id } });
      await tx.marketTransferListing.update({ where: { id: offer.listingId }, data: { status: "SOLD" } });
      await invalidatePlayerNegotiations(tx, input.leagueId, offer.listing.playerRegistrationId);
      response = { transactionId: transaction.id, status: "ACCEPTED", amountCredits: Number(offer.amountCredits) };
    } else {
      if (!input.playerRegistrationId || input.expectedQuoteCredits === undefined) fail("INVALID_INPUT", 422);
      const current = await currentPrice(tx, input.playerRegistrationId, input.leagueId);
      const quote = instantSaleQuote(current);
      if (BigInt(input.expectedQuoteCredits) !== quote) fail("QUOTE_CHANGED", 409, { quoteCredits: Number(quote) });
      const transaction = await transfer(tx, { leagueId: input.leagueId, playerRegistrationId: input.playerRegistrationId, sellerTeamId: team.id, amount: quote, idempotencyKey: input.idempotencyKey, transactionType: "INSTANT_SELL", actorProfileId: profile.id });
      await invalidatePlayerNegotiations(tx, input.leagueId, input.playerRegistrationId);
      response = { transactionId: transaction.id, status: "SOLD", amountCredits: Number(quote) };
    }
    return saveRequest(tx, input, team.id, response);
  });
  invalidateCache(cacheTags({ leagueId: input.leagueId }));
  void wakePushWorker();
  return result;
}
