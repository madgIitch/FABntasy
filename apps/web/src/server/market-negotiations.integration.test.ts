import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { advanceMarketNegotiations, executeMarketNegotiation, getMarketNegotiationsForActor } from "./market-negotiations";
import { nextMarketMidnight } from "./market-v2";
import { cancelCompetitionNegotiations } from "./market-offer-invalidation";
import { executeMarket } from "./fantasy-market";

const testUrl = process.env.TEST_DATABASE_URL;
const integration = testUrl ? describe : describe.skip;

integration("manager negotiations in PostgreSQL", () => {
  it("keeps proposals private and settles counteroffers, system offers and repriced instant sales", async () => {
    const url = new URL(testUrl!);
    if (!( ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.includes("_test") && process.env.DATABASE_URL === testUrl)) throw new Error("MARKET_TEST_DATABASE_REQUIRED");
    const suffix = randomUUID().slice(0, 8);
    const federation = await db.federation.create({ data: { name: `Offers ${suffix}` } });
    const competition = await db.competition.create({ data: { federationId: federation.id, name: `Offers ${suffix}` } });
    const season = await db.season.create({ data: { name: `Offers ${suffix}` } });
    const competitionSeason = await db.competitionSeason.create({ data: { competitionId: competition.id, seasonId: season.id, fantasyEnabled: true, fantasyRole: "validation" } });
    const realTeam = await db.team.create({ data: { name: `Offers ${suffix}` } });
    const realRegistration = await db.teamRegistration.create({ data: { competitionSeasonId: competitionSeason.id, teamId: realTeam.id } });
    const players = await Promise.all(["Private", "System", "Instant", "Race", "Disable", "Expiry", "ClauseRace"].map(async label => {
      const player = await db.player.create({ data: { displayName: `${label} ${suffix}` } });
      const registration = await db.playerRegistration.create({ data: { competitionSeasonId: competitionSeason.id, teamRegistrationId: realRegistration.id, playerId: player.id } });
      return { player, registration };
    }));
    const authIds = [randomUUID(), randomUUID(), randomUUID()];
    const usernames = ["seller", "buyer", "spectator"].map(name => `${name}_${suffix}`);
    await db.$executeRaw(Prisma.sql`INSERT INTO auth.users (id, raw_user_meta_data) VALUES (${authIds[0]}::uuid, ${JSON.stringify({ username: usernames[0] })}::jsonb), (${authIds[1]}::uuid, ${JSON.stringify({ username: usernames[1] })}::jsonb), (${authIds[2]}::uuid, ${JSON.stringify({ username: usernames[2] })}::jsonb)`);
    const users = await Promise.all(authIds.map(authUserId => db.userProfile.findUniqueOrThrow({ where: { authUserId } })));
    const league = await db.fantasyLeague.create({ data: { competitionSeasonId: competitionSeason.id, ownerProfileId: users[0].id, name: `Offers ${suffix}`, leagueCode: suffix.toUpperCase() } });
    await db.leagueMembership.createMany({ data: users.map(user => ({ leagueId: league.id, userProfileId: user.id })) });
    const rules = await db.fantasyRosterRuleSet.create({ data: { competitionSeasonId: competitionSeason.id, identifier: "offers-test", version: "1", budgetCredits: 30_000_000n, rosterSize: 8, starterCount: 5, substituteCount: 3, maxPerRealTeam: 7, coldStartPriceCredits: 5_000_000n } });
    const teams = await Promise.all(users.map(user => db.fantasyTeam.create({ data: { leagueId: league.id, userProfileId: user.id, competitionSeasonId: competitionSeason.id, rosterRuleSetId: rules.id, balanceCredits: 30_000_000n } })));
    await db.fantasyRosterSlot.createMany({ data: players.map(({ registration }) => ({ leagueId: league.id, fantasyTeamId: teams[0].id, playerRegistrationId: registration.id, acquisitionPrice: 5_000_000n })) });
    try {
      const id = (index: number) => players[index].registration.id;
      const act = (index: number, action: Parameters<typeof executeMarketNegotiation>[1]["action"], fields: Record<string, unknown>) => executeMarketNegotiation(users[index].authUserId, { leagueId: league.id, action, idempotencyKey: randomUUID(), ...fields });
      const sent = await act(1, "OFFER", { playerRegistrationId: id(0), amountCredits: 5_000_000 });
      const threadId = sent.threadId as string;
      expect((await getMarketNegotiationsForActor(users[2].authUserId, league.id)).threads).toHaveLength(0);
      expect((await getMarketNegotiationsForActor(users[1].authUserId, league.id)).reservedOfferCredits).toBe(5_000_000);
      await expect(act(1, "OFFER", { playerRegistrationId: id(2), amountCredits: 26_000_000 })).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
      expect((await getMarketNegotiationsForActor(users[0].authUserId, league.id)).threads[0].proposals[0].amountCredits).toBe(5_000_000);
      expect((await getMarketNegotiationsForActor(users[1].authUserId, league.id)).threads[0].proposals[0].amountCredits).toBe(5_000_000);
      const counter = await act(0, "COUNTER", { threadId, amountCredits: 6_000_000 });
      expect(new Date(counter.expiresAt as string).getTime()).toBeGreaterThan(new Date(sent.expiresAt as string).getTime());
      await act(1, "ACCEPT", { threadId });
      expect((await db.fantasyRosterSlot.findUniqueOrThrow({ where: { leagueId_playerRegistrationId: { leagueId: league.id, playerRegistrationId: id(0) } } })).fantasyTeamId).toBe(teams[1].id);
      expect(await db.marketTransaction.count({ where: { leagueId: league.id, transactionType: "MANAGER_OFFER" } })).toBe(1);

      const listed = await act(0, "LIST", { playerRegistrationId: id(1), desiredPriceCredits: 7_000_000 });
      expect(new Date(listed.expiresAt as string).getTime() - Date.now()).toBeGreaterThan(71 * 60 * 60 * 1000);
      expect((await getMarketNegotiationsForActor(users[2].authUserId, league.id)).listings.some(item => item.id === listed.listingId)).toBe(true);
      expect((await getMarketNegotiationsForActor(users[0].authUserId, league.id)).listings.find(item => item.id === listed.listingId)?.systemOffer).toBeNull();
      const boundary = nextMarketMidnight(new Date());
      await db.marketV2Cycle.create({ data: { leagueId: league.id, opensAt: boundary, closesAt: nextMarketMidnight(new Date(boundary.getTime() + 1000)) } });
      await advanceMarketNegotiations(league.id, new Date(boundary.getTime() + 1000));
      const systemOffer = await db.marketSystemOffer.findFirstOrThrow({ where: { listingId: listed.listingId as string } });
      expect(systemOffer.amountCredits).toBe(5_000_000n);
      const secondBoundary = nextMarketMidnight(new Date(boundary.getTime() + 1000));
      await db.marketV2Cycle.create({ data: { leagueId: league.id, opensAt: secondBoundary, closesAt: nextMarketMidnight(new Date(secondBoundary.getTime() + 1000)) } });
      await advanceMarketNegotiations(league.id, new Date(secondBoundary.getTime() + 1000));
      expect((await db.marketSystemOffer.findUniqueOrThrow({ where: { id: systemOffer.id } })).status).toBe("EXPIRED");
      const renewed = await db.marketSystemOffer.findFirstOrThrow({ where: { listingId: listed.listingId as string, status: "ACTIVE" } });
      expect(renewed.amountCredits).toBe(5_000_000n);
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(secondBoundary.getTime() + 1000));
      try { await act(0, "ACCEPT_SYSTEM", { systemOfferId: renewed.id }); }
      finally { vi.useRealTimers(); }
      expect(await db.fantasyRosterSlot.findUnique({ where: { leagueId_playerRegistrationId: { leagueId: league.id, playerRegistrationId: id(1) } } })).toBeNull();

      const price = await db.playerPrice.create({ data: { playerRegistrationId: id(2), competitionSeasonId: competitionSeason.id, algorithmVersion: "offers-test", currentPrice: 6_000_000n, allTimeHigh: 6_000_000n, allTimeLow: 5_000_000n } });
      await expect(act(0, "INSTANT_SELL", { playerRegistrationId: id(2), expectedQuoteCredits: 4_000_000 })).rejects.toMatchObject({ code: "QUOTE_CHANGED", details: { quoteCredits: 4_800_000 } });
      const pending = await act(1, "OFFER", { playerRegistrationId: id(2), amountCredits: 5_000_000 });
      const saleKey = randomUUID();
      const saleInput = { leagueId: league.id, action: "INSTANT_SELL" as const, idempotencyKey: saleKey, playerRegistrationId: id(2), expectedQuoteCredits: 4_800_000 };
      const sold = await executeMarketNegotiation(users[0].authUserId, saleInput);
      expect((await executeMarketNegotiation(users[0].authUserId, saleInput)).replayed).toBe(true);
      expect((await db.marketTransaction.findUniqueOrThrow({ where: { id: sold.transactionId as string } })).priceCredits).toBe(4_800_000n);
      expect(await db.fantasyRosterSlot.findUnique({ where: { leagueId_playerRegistrationId: { leagueId: league.id, playerRegistrationId: id(2) } } })).toBeNull();
      expect((await db.marketOfferThread.findUniqueOrThrow({ where: { id: pending.threadId as string } })).status).toBe("INVALID");
      expect((await db.marketOfferProposal.findUniqueOrThrow({ where: { id: pending.proposalId as string } })).status).toBe("INVALID");
      await db.playerPrice.delete({ where: { id: price.id } });

      const race = await act(1, "OFFER", { playerRegistrationId: id(3), amountCredits: 5_000_000 });
      const outcomes = await Promise.allSettled([act(0, "ACCEPT", { threadId: race.threadId }), act(0, "INSTANT_SELL", { playerRegistrationId: id(3), expectedQuoteCredits: 4_000_000 })]);
      expect(outcomes.filter(outcome => outcome.status === "fulfilled")).toHaveLength(1);
      expect(await db.marketTransaction.count({ where: { leagueId: league.id, playerRegistrationId: id(3) } })).toBe(1);

      const clauseRace = await act(1, "OFFER", { playerRegistrationId: id(6), amountCredits: 5_000_000 });
      const clauseOutcomes = await Promise.allSettled([
        act(0, "ACCEPT", { threadId: clauseRace.threadId }),
        executeMarket({ authUserId: users[1].authUserId }, { leagueId: league.id, playerRegistrationId: id(6), action: "CLAUSE", idempotencyKey: randomUUID() }),
      ]);
      expect(clauseOutcomes.filter(outcome => outcome.status === "fulfilled")).toHaveLength(1);
      expect(await db.marketTransaction.count({ where: { leagueId: league.id, playerRegistrationId: id(6), transactionType: { in: ["CLAUSE", "MANAGER_OFFER"] } } })).toBe(1);

      const expiring = await act(1, "OFFER", { playerRegistrationId: id(5), amountCredits: 5_000_000 });
      await advanceMarketNegotiations(league.id, new Date(new Date(expiring.expiresAt as string).getTime() + 1000));
      expect((await db.marketOfferThread.findUniqueOrThrow({ where: { id: expiring.threadId as string } })).status).toBe("EXPIRED");
      expect((await db.marketOfferProposal.findUniqueOrThrow({ where: { id: expiring.proposalId as string } })).status).toBe("EXPIRED");

      const disableListing = await act(0, "LIST", { playerRegistrationId: id(4) });
      const disableOffer = await act(1, "OFFER", { playerRegistrationId: id(4), amountCredits: 5_000_000 });
      await db.$transaction(async tx => { await tx.competitionSeason.update({ where: { id: competitionSeason.id }, data: { fantasyEnabled: false } }); await cancelCompetitionNegotiations(tx, competitionSeason.id); });
      expect((await db.marketTransferListing.findUniqueOrThrow({ where: { id: disableListing.listingId as string } })).status).toBe("INVALID");
      expect((await db.marketOfferThread.findUniqueOrThrow({ where: { id: disableOffer.threadId as string } })).status).toBe("INVALID");
    } finally {
      vi.useRealTimers();
      await db.marketNegotiationRequest.deleteMany({ where: { actorTeamId: { in: teams.map(team => team.id) } } });
      await db.marketOfferProposal.deleteMany({ where: { thread: { leagueId: league.id } } });
      await db.marketOfferThread.deleteMany({ where: { leagueId: league.id } });
      await db.marketSystemOffer.deleteMany({ where: { listing: { leagueId: league.id } } });
      await db.marketTransferListing.deleteMany({ where: { leagueId: league.id } });
      await db.marketV2Request.deleteMany({ where: { listing: { leagueId: league.id } } });
      await db.marketV2Bid.deleteMany({ where: { listing: { leagueId: league.id } } });
      await db.marketV2Listing.deleteMany({ where: { leagueId: league.id } });
      await db.marketV2Cycle.deleteMany({ where: { leagueId: league.id } });
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
      await db.playerPrice.deleteMany({ where: { competitionSeasonId: competitionSeason.id } });
      for (const item of players) { await db.playerRegistration.delete({ where: { id: item.registration.id } }); await db.player.delete({ where: { id: item.player.id } }); }
      await db.teamRegistration.delete({ where: { id: realRegistration.id } });
      await db.team.delete({ where: { id: realTeam.id } });
      await db.userProfile.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
      await db.$executeRaw(Prisma.sql`DELETE FROM auth.users WHERE id IN (${Prisma.join(authIds.map(id => Prisma.sql`${id}::uuid`))})`);
      await db.competitionSeason.delete({ where: { id: competitionSeason.id } });
      await db.season.delete({ where: { id: season.id } });
      await db.competition.delete({ where: { id: competition.id } });
      await db.federation.delete({ where: { id: federation.id } });
    }
  }, 60000);
});
