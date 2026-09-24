import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "./db";
import { advanceMarketV2, cancelCompetitionMarketV2, getMarketV2ForActor, startMarketV2, submitMarketV2Bid } from "./market-v2";

const testUrl = process.env.TEST_DATABASE_URL;
const integration = testUrl ? describe : describe.skip;

integration("Market V2 PostgreSQL settlement", () => {
  it("reserves bids, keeps them private, and awards one equal-price winner under concurrent workers", async () => {
    const url = new URL(testUrl!);
    if (!(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.includes("_test") && process.env.DATABASE_URL === testUrl)) throw new Error("MARKET_TEST_DATABASE_REQUIRED");
    const suffix = randomUUID().slice(0, 8);
    const federation = await db.federation.create({ data: { name: `Market Test ${suffix}` } });
    const competition = await db.competition.create({ data: { federationId: federation.id, name: `Competition ${suffix}` } });
    const season = await db.season.create({ data: { name: `Season ${suffix}` } });
    const competitionSeason = await db.competitionSeason.create({ data: { competitionId: competition.id, seasonId: season.id, fantasyEnabled: true, fantasyRole: "primary" } });
    const realTeam = await db.team.create({ data: { name: `Real ${suffix}` } });
    const registration = await db.teamRegistration.create({ data: { competitionSeasonId: competitionSeason.id, teamId: realTeam.id } });
    const player = await db.player.create({ data: { displayName: `Player ${suffix}` } });
    const playerRegistration = await db.playerRegistration.create({ data: { competitionSeasonId: competitionSeason.id, teamRegistrationId: registration.id, playerId: player.id } });
    const secondPlayer = await db.player.create({ data: { displayName: `Second ${suffix}` } });
    const secondRegistration = await db.playerRegistration.create({ data: { competitionSeasonId: competitionSeason.id, teamRegistrationId: registration.id, playerId: secondPlayer.id } });
    const users = await Promise.all(["ana", "bea", "spectator"].map(async name => db.userProfile.create({ data: { authUserId: randomUUID(), username: `${name}_${suffix}` } })));
    const league = await db.fantasyLeague.create({ data: { competitionSeasonId: competitionSeason.id, ownerProfileId: users[0].id, name: `League ${suffix}`, leagueCode: suffix.toUpperCase() } });
    await db.leagueMembership.createMany({ data: users.map(user => ({ leagueId: league.id, userProfileId: user.id })) });
    const rules = await db.fantasyRosterRuleSet.create({ data: { competitionSeasonId: competitionSeason.id, identifier: "test", version: "1", budgetCredits: 20_000_000n, rosterSize: 7, starterCount: 5, substituteCount: 2, maxPerRealTeam: 2, coldStartPriceCredits: 5_000_000n } });
    const teams = await Promise.all(users.map(user => db.fantasyTeam.create({ data: { leagueId: league.id, userProfileId: user.id, competitionSeasonId: competitionSeason.id, rosterRuleSetId: rules.id, balanceCredits: 20_000_000n } })));
    try {
      await startMarketV2(users[0].id);
      expect((await startMarketV2(users[0].id)).alreadyStarted).toBe(true);
      const cycle = await db.marketV2Cycle.findFirstOrThrow({ where: { leagueId: league.id, status: "OPEN" } });
      const listing = await db.marketV2Listing.findFirstOrThrow({ where: { cycleId: cycle.id, playerRegistrationId: playerRegistration.id } });
      const secondListing = await db.marketV2Listing.findFirstOrThrow({ where: { cycleId: cycle.id, playerRegistrationId: secondRegistration.id } });
      const makeBid = (index: number) => submitMarketV2Bid(users[index].authUserId, { leagueId: league.id, listingId: listing.id, amountCredits: 5_000_000, action: "BID", idempotencyKey: randomUUID() });
      const firstKey = randomUUID();
      await submitMarketV2Bid(users[0].authUserId, { leagueId: league.id, listingId: listing.id, amountCredits: 5_000_000, action: "BID", idempotencyKey: firstKey });
      await makeBid(0);
      const beforeReplay = await db.marketV2Bid.findFirstOrThrow({ where: { listingId: listing.id, fantasyTeamId: teams[0].id } });
      expect((await submitMarketV2Bid(users[0].authUserId, { leagueId: league.id, listingId: listing.id, amountCredits: 5_000_000, action: "BID", idempotencyKey: firstKey })).replayed).toBe(true);
      expect((await db.marketV2Bid.findUniqueOrThrow({ where: { id: beforeReplay.id } })).bidAt).toEqual(beforeReplay.bidAt);
      await makeBid(1);
      await expect(submitMarketV2Bid(users[0].authUserId, { leagueId: league.id, listingId: secondListing.id, amountCredits: 16_000_000, action: "BID", idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
      await submitMarketV2Bid(users[0].authUserId, { leagueId: league.id, listingId: secondListing.id, amountCredits: 14_000_000, action: "BID", idempotencyKey: randomUUID() });
      expect((await getMarketV2ForActor(users[0].authUserId, league.id)).reservedCredits).toBe(19_000_000);
      await submitMarketV2Bid(users[0].authUserId, { leagueId: league.id, listingId: secondListing.id, action: "CANCEL", idempotencyKey: randomUUID() });
      expect((await getMarketV2ForActor(users[0].authUserId, league.id)).reservedCredits).toBe(5_000_000);
      await expect(submitMarketV2Bid(users[2].authUserId, { leagueId: league.id, listingId: listing.id, amountCredits: 21_000_000, action: "BID", idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
      const before = await getMarketV2ForActor(users[2].authUserId, league.id);
      expect(before.listings[0].myBid).toBeNull();
      const close = new Date(cycle.closesAt.getTime() + 1);
      await Promise.all([advanceMarketV2(league.id, close), advanceMarketV2(league.id, close)]);
      const [transactions, slots, ledger, bids] = await Promise.all([
        db.marketTransaction.findMany({ where: { leagueId: league.id, transactionType: "AUCTION" } }),
        db.fantasyRosterSlot.findMany({ where: { leagueId: league.id } }),
        db.fantasyBudgetLedgerEntry.findMany({ where: { leagueId: league.id, entryType: "AUCTION_BUY" } }),
        db.marketV2Bid.findMany({ where: { listingId: listing.id } }),
      ]);
      expect(transactions).toHaveLength(1);
      expect(slots).toHaveLength(1);
      expect(ledger).toHaveLength(1);
      expect(slots[0].fantasyTeamId).toBe(teams[0].id);
      expect(bids.map(bid => bid.status).sort()).toEqual(["LOST", "WON"]);
      const spectator = await getMarketV2ForActor(users[2].authUserId, league.id);
      expect(spectator.history.find(item => item.playerRegistrationId === playerRegistration.id)).toMatchObject({ winner: users[0].username, winningPrice: 5_000_000, bids: [] });
      const loser = await getMarketV2ForActor(users[1].authUserId, league.id);
      expect(loser.history.find(item => item.playerRegistrationId === playerRegistration.id)?.bids).toHaveLength(2);
      const nextCycle = await db.marketV2Cycle.findFirstOrThrow({ where: { leagueId: league.id, status: "OPEN" } });
      const nextListing = await db.marketV2Listing.findFirstOrThrow({ where: { cycleId: nextCycle.id } });
      const pendingBid = await db.marketV2Bid.create({ data: { listingId: nextListing.id, fantasyTeamId: teams[1].id, amountCredits: nextListing.referencePrice } });
      await db.$transaction(async tx => { await tx.competitionSeason.update({ where: { id: competitionSeason.id }, data: { fantasyEnabled: false } }); await cancelCompetitionMarketV2(tx, competitionSeason.id); });
      expect((await db.marketV2Cycle.findUniqueOrThrow({ where: { id: nextCycle.id } })).status).toBe("CANCELLED");
      expect((await db.marketV2Bid.findUniqueOrThrow({ where: { id: pendingBid.id } })).status).toBe("INVALID");
    } finally {
      await db.marketV2Request.deleteMany({ where: { listing: { leagueId: league.id } } });
      await db.marketV2Bid.deleteMany({ where: { listing: { leagueId: league.id } } });
      await db.marketV2Listing.deleteMany({ where: { leagueId: league.id } });
      await db.marketV2Cycle.deleteMany({ where: { leagueId: league.id } });
      await db.marketV2Setting.deleteMany({ where: { id: "global" } });
      await db.pushOutboxEvent.deleteMany({ where: { userProfileId: { in: users.map(user => user.id) } } });
      await db.leagueActivityEvent.deleteMany({ where: { leagueId: league.id } });
      await db.fantasyBudgetLedgerEntry.deleteMany({ where: { leagueId: league.id } });
      await db.marketProtection.deleteMany({ where: { leagueId: league.id } });
      await db.marketTransaction.deleteMany({ where: { leagueId: league.id } });
      await db.fantasyRosterSlot.deleteMany({ where: { leagueId: league.id } });
      await db.fantasyTeam.deleteMany({ where: { leagueId: league.id } });
      await db.leagueMembership.deleteMany({ where: { leagueId: league.id } });
      await db.fantasyLeague.delete({ where: { id: league.id } });
      await db.fantasyRosterRuleSet.delete({ where: { id: rules.id } });
      await db.playerRegistration.delete({ where: { id: playerRegistration.id } });
      await db.playerRegistration.delete({ where: { id: secondRegistration.id } });
      await db.player.delete({ where: { id: player.id } });
      await db.player.delete({ where: { id: secondPlayer.id } });
      await db.teamRegistration.delete({ where: { id: registration.id } });
      await db.team.delete({ where: { id: realTeam.id } });
      await db.adminAuditEvent.deleteMany({ where: { actorProfileId: users[0].id } });
      await db.userProfile.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
      await db.competitionSeason.delete({ where: { id: competitionSeason.id } });
      await db.season.delete({ where: { id: season.id } });
      await db.competition.delete({ where: { id: competition.id } });
      await db.federation.delete({ where: { id: federation.id } });
    }
  }, 30000);
});
