import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "./db";
import { getMarketContext } from "./fantasy-market";

const testUrl = process.env.TEST_DATABASE_URL;
const integration = testUrl ? describe : describe.skip;

integration("starting budget in PostgreSQL", () => {
  it("starts new teams at 60 M and preserves an existing 100 M team", async () => {
    const url = new URL(testUrl!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.includes("_test") || process.env.DATABASE_URL !== testUrl || process.env.DIRECT_URL !== testUrl) throw new Error("LOCAL_TEST_DATABASE_REQUIRED");
    const suffix = randomUUID().slice(0, 8);
    const authIds = [randomUUID(), randomUUID()];
    for (const [index, id] of authIds.entries()) await db.$executeRaw`INSERT INTO auth.users (id, raw_user_meta_data) VALUES (${id}::uuid, ${JSON.stringify({ username: `budget_${suffix}_${index}` })}::jsonb)`;
    const users = await Promise.all(authIds.map(authUserId => db.userProfile.findUniqueOrThrow({ where: { authUserId } })));
    const federation = await db.federation.create({ data: { name: `Budget federation ${suffix}` } });
    const season = await db.season.create({ data: { name: `Budget season ${suffix}` } });
    const competition = await db.competition.create({ data: { federationId: federation.id, name: `Budget competition ${suffix}` } });
    const edition = await db.competitionSeason.create({ data: { competitionId: competition.id, seasonId: season.id, fantasyEnabled: true } });
    const league = await db.fantasyLeague.create({ data: { ownerProfileId: users[0].id, competitionSeasonId: edition.id, name: `Budget league ${suffix}`, leagueCode: `B${suffix}`, selectedSeasons: { create: { competitionSeasonId: edition.id } } } });
    await db.leagueMembership.createMany({ data: users.map(user => ({ leagueId: league.id, userProfileId: user.id })) });
    const oldRules = await db.fantasyRosterRuleSet.create({ data: { competitionSeasonId: edition.id, identifier: "cold-start", version: "1", budgetCredits: 100_000_000n, rosterSize: 7, starterCount: 5, substituteCount: 2, maxPerRealTeam: 2, coldStartPriceCredits: 3_000_000n } });
    const oldTeam = await db.fantasyTeam.create({ data: { userProfileId: users[0].id, leagueId: league.id, competitionSeasonId: edition.id, rosterRuleSetId: oldRules.id } });
    const oldContext = await getMarketContext({ authUserId: authIds[0] }, league.id);
    const newContext = await getMarketContext({ authUserId: authIds[1] }, league.id);
    const newTeam = await db.fantasyTeam.findUniqueOrThrow({ where: { userProfileId_leagueId: { userProfileId: users[1].id, leagueId: league.id } }, include: { rosterRuleSet: true } });
    expect(oldContext.balanceCredits).toBe(100_000_000);
    expect((await db.fantasyTeam.findUniqueOrThrow({ where: { id: oldTeam.id } })).rosterRuleSetId).toBe(oldRules.id);
    expect(newContext.balanceCredits).toBe(60_000_000);
    expect(newTeam.rosterRuleSet.version).toBe("2");
    expect(newTeam.rosterRuleSet.budgetCredits).toBe(60_000_000n);
  });
});
