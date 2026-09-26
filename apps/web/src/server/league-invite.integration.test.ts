import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { createInvite, createLeague, getInvite, invitePreview, joinLeagueByInvite } from "./private-leagues";

const testUrl = process.env.TEST_DATABASE_URL;
const integration = testUrl ? describe : describe.skip;

integration("league invite links in PostgreSQL", () => {
  it("limits concurrent joins, preserves members on rotation and rejects old links", async () => {
    const url = new URL(testUrl!);
    if (!( ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.includes("_test") && process.env.DATABASE_URL === testUrl)) throw new Error("LEAGUE_TEST_DATABASE_REQUIRED");
    vi.stubEnv("LEAGUE_INVITE_ENCRYPTION_KEY", "league-integration-test-key-with-at-least-32-characters");
    const suffix = randomUUID().slice(0, 8);
    const federation = await db.federation.create({ data: { name: `Invites ${suffix}` } });
    const competition = await db.competition.create({ data: { federationId: federation.id, name: `Invites ${suffix}` } });
    const season = await db.season.create({ data: { name: `Invites ${suffix}` } });
    const competitionSeason = await db.competitionSeason.create({ data: { competitionId: competition.id, seasonId: season.id, fantasyEnabled: true } });
    const authIds = [randomUUID(), randomUUID(), randomUUID()];
    const usernames = ["owner", "first", "second"].map(name => `${name}_${suffix}`);
    await db.$executeRaw(Prisma.sql`INSERT INTO auth.users (id, raw_user_meta_data) VALUES (${authIds[0]}::uuid, ${JSON.stringify({ username: usernames[0] })}::jsonb), (${authIds[1]}::uuid, ${JSON.stringify({ username: usernames[1] })}::jsonb), (${authIds[2]}::uuid, ${JSON.stringify({ username: usernames[2] })}::jsonb)`);
    const users = await Promise.all(authIds.map(authUserId => db.userProfile.findUniqueOrThrow({ where: { authUserId } })));
    const actors = users.map(user => ({ authUserId: user.authUserId }));
    const league = await createLeague(actors[0], { name: `Invites ${suffix}`, competitionSeasonId: competitionSeason.id });
    await db.fantasyLeague.update({ where: { id: league.id }, data: { memberLimit: 2 } });
    const legacy = await db.fantasyLeague.create({ data: { competitionSeasonId: competitionSeason.id, ownerProfileId: users[0].id, name: `Legacy ${suffix}`, leagueCode: suffix.toUpperCase() } });
    await db.leagueMembership.create({ data: { leagueId: legacy.id, userProfileId: users[0].id, role: "OWNER" } });
    try {
      expect(await db.leagueInvite.count({ where: { leagueId: league.id, status: "ACTIVE" } })).toBe(1);
      const legacyLink = await getInvite(actors[0], legacy.id);
      expect((await invitePreview(legacyLink.token)).name).toBe(legacy.name);
      const { token } = await getInvite(actors[0], league.id);
      expect((await getInvite(actors[0], league.id)).token).toBe(token);
      expect((await invitePreview(token)).members).toBe(1);
      await expect(getInvite(actors[1], league.id)).rejects.toMatchObject({ code: "LEAGUE_NOT_FOUND" });
      const results = await Promise.allSettled([joinLeagueByInvite(actors[1], token), joinLeagueByInvite(actors[2], token)]);
      expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
      expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "LEAGUE_FULL" } });
      const winner = results[0].status === "fulfilled" ? actors[1] : actors[2];
      expect((await joinLeagueByInvite(winner, token)).id).toBe(league.id);
      const next = await createInvite(actors[0], league.id);
      await expect(invitePreview(token)).rejects.toMatchObject({ code: "INVITE_INVALID" });
      expect((await invitePreview(next.token)).members).toBe(2);
      expect(await db.leagueMembership.count({ where: { leagueId: league.id, status: "ACTIVE" } })).toBe(2);
    } finally {
      await db.pushOutboxEvent.deleteMany({ where: { userProfileId: { in: users.map(user => user.id) } } });
      await db.leagueActivityEvent.deleteMany({ where: { leagueId: league.id } });
      await db.leagueInvite.deleteMany({ where: { leagueId: league.id } });
      await db.leagueInvite.deleteMany({ where: { leagueId: legacy.id } });
      await db.leagueMembership.deleteMany({ where: { leagueId: league.id } });
      await db.leagueMembership.deleteMany({ where: { leagueId: legacy.id } });
      await db.fantasyLeague.delete({ where: { id: league.id } });
      await db.fantasyLeague.delete({ where: { id: legacy.id } });
      await db.userProfile.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
      await db.$executeRaw(Prisma.sql`DELETE FROM auth.users WHERE id IN (${Prisma.join(authIds.map(id => Prisma.sql`${id}::uuid`))})`);
      await db.competitionSeason.delete({ where: { id: competitionSeason.id } });
      await db.season.delete({ where: { id: season.id } });
      await db.competition.delete({ where: { id: competition.id } });
      await db.federation.delete({ where: { id: federation.id } });
      vi.unstubAllEnvs();
    }
  });
});
