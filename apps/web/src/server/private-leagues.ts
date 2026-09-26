import { Prisma } from "@prisma/client";
import { MAX_LEAGUE_MEMBERS, createInviteToken, createLeagueCode, hashInviteToken, validLeagueName, type LeagueErrorCode } from "../../../../packages/domain/private-league";
import { db } from "./db";
import { enqueuePushEvent, wakePushWorker } from "./push-outbox";
import { appendLeagueEvent } from "./social-league";
import { requireFantasyCompetition } from "./fantasy-availability";
import { cancelLeagueMarketV2 } from "./market-v2";
import { cancelLeagueNegotiations } from "./market-offer-invalidation";
import { decryptInviteToken, encryptInviteToken } from "./league-invite-crypto";
import { requireAvailableLeagueSeason } from "./league-competition-seasons";

export type LeagueActor = { authUserId: string };
export class LeagueServiceError extends Error { constructor(public code: LeagueErrorCode, public status = 409) { super(code); } }
function fail(code: LeagueErrorCode, status = 409): never { throw new LeagueServiceError(code, status); }
async function retrySerializable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) throw error;
      if (attempt === 2) fail("VERSION_CONFLICT");
    }
  }
  throw new LeagueServiceError("VERSION_CONFLICT");
}
const enabled = () => process.env.FANTASY_LEAGUE_MUTATIONS_ENABLED !== "false";
async function profileId(client: Prisma.TransactionClient | typeof db, actor: LeagueActor, requireComplete = false) { const p = await client.userProfile.findUnique({ where: { authUserId: actor.authUserId }, select: { id: true, username: true } }); if (!p) fail("LEAGUE_NOT_FOUND", 404); if (requireComplete && !p.username) fail("INVALID_INPUT", 422); return p.id; }
async function requireLeagueFantasy(tx: Prisma.TransactionClient, leagueId: string) {
  const league = await tx.fantasyLeague.findUnique({ where: { id: leagueId }, select: { competitionSeasonId: true } });
  if (!league) fail("LEAGUE_NOT_FOUND", 404);
  await requireAvailableLeagueSeason(tx, leagueId);
}

export async function listLeagues(actor: LeagueActor) { const userProfileId = await profileId(db, actor); return db.fantasyLeague.findMany({ where: { memberships: { some: { userProfileId, status: "ACTIVE" } }, status: "ACTIVE", legacyTeamId: null, OR: [{ competitionSeason: { fantasyEnabled: true } }, { selectedSeasons: { some: { competitionSeason: { fantasyEnabled: true } } } }] }, omit:{passwordHash:true,leagueCode:true},include: { competitionSeason: { include: { competition: true } }, selectedSeasons: { include: { competitionSeason: { include: { competition: true } } } }, memberships: { where: { status: "ACTIVE" }, include: { userProfile: true } } }, orderBy: { updatedAt: "desc" } }); }
export async function resolveActiveLeagueId(actor: LeagueActor) {
  const profile = await db.userProfile.findUnique({ where: { authUserId: actor.authUserId }, select: { id: true, activeLeagueId: true } });
  if (!profile) fail("LEAGUE_NOT_FOUND", 404);
  const memberships = await db.leagueMembership.findMany({ where: { userProfileId: profile.id, status: "ACTIVE", league: { status: "ACTIVE", legacyTeamId: null, OR: [{ competitionSeason: { fantasyEnabled: true } }, { selectedSeasons: { some: { competitionSeason: { fantasyEnabled: true } } } }] } }, orderBy: [{ joinedAt: "desc" }, { id: "asc" }], select: { leagueId: true } });
  const valid = memberships.some((membership) => membership.leagueId === profile.activeLeagueId);
  const activeLeagueId = valid ? profile.activeLeagueId : memberships[0]?.leagueId ?? null;
  if (activeLeagueId !== profile.activeLeagueId) await db.userProfile.update({ where: { id: profile.id }, data: { activeLeagueId } });
  return activeLeagueId;
}
export async function selectActiveLeague(actor: LeagueActor, leagueId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(leagueId)) fail("INVALID_INPUT", 422);
  const profile = await db.userProfile.findUnique({ where: { authUserId: actor.authUserId }, select: { id: true } });
  if (!profile) fail("LEAGUE_NOT_FOUND", 404);
  const membership = await db.leagueMembership.findFirst({ where: { userProfileId: profile.id, leagueId, status: "ACTIVE", league: { status: "ACTIVE", legacyTeamId: null, OR: [{ competitionSeason: { fantasyEnabled: true } }, { selectedSeasons: { some: { competitionSeason: { fantasyEnabled: true } } } }] } }, select: { id: true } });
  if (!membership) fail("LEAGUE_NOT_FOUND", 404);
  await db.userProfile.update({ where: { id: profile.id }, data: { activeLeagueId: leagueId } });
  return { activeLeagueId: leagueId };
}
export async function getLeague(actor: LeagueActor, leagueId: string) { const userProfileId = await profileId(db, actor); const league = await db.fantasyLeague.findFirst({ where: { id: leagueId, status: "ACTIVE", memberships: { some: { userProfileId, status: "ACTIVE" } } },omit:{passwordHash:true,leagueCode:true}, include: { competitionSeason: { include: { competition: true } }, selectedSeasons: { include: { competitionSeason: { include: { competition: true } } } }, memberships: { where: { status: "ACTIVE" }, include: { userProfile: true }, orderBy: { joinedAt: "asc" } } } }); if (!league) fail("LEAGUE_NOT_FOUND", 404); await requireAvailableLeagueSeason(db, leagueId); return league; }
export async function createLeague(actor: LeagueActor, input: { name: string; competitionSeasonId?: string; competitionSeasonIds?: string[]; primaryCompetitionSeasonId?: string }) {
  if (!enabled()) fail("FEATURE_DISABLED");
  const name = validLeagueName(input.name);
  const ids = input.competitionSeasonIds ?? (input.competitionSeasonId ? [input.competitionSeasonId] : []);
  const primaryId = input.primaryCompetitionSeasonId ?? input.competitionSeasonId;
  if (!primaryId || !Array.isArray(ids) || ids.length < 1 || ids.length > 32 || new Set(ids).size !== ids.length || !ids.includes(primaryId) || ids.some(id => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) fail("INVALID_INPUT", 422);
  if (ids.length > 1 && process.env.MULTI_COMPETITION_LEAGUES_ENABLED === "false") fail("FEATURE_DISABLED");
  const token = createInviteToken();
  const ciphertext = encryptInviteToken(token);
  return db.$transaction(async tx => {
    for (const id of [...ids].sort()) await requireFantasyCompetition(tx, id);
    const ownerProfileId = await profileId(tx, actor, true);
    let leagueCode = createLeagueCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!await tx.fantasyLeague.findUnique({ where: { leagueCode } })) break;
      leagueCode = createLeagueCode();
    }
    const league = await tx.fantasyLeague.create({ data: { name, competitionSeasonId: primaryId, ownerProfileId, memberLimit: MAX_LEAGUE_MEMBERS, leagueCode, passwordHash: null, selectedSeasons: { create: ids.map(competitionSeasonId => ({ competitionSeasonId })) } }, omit: { passwordHash: true, leagueCode: true } });
    await tx.leagueMembership.create({ data: { leagueId: league.id, userProfileId: ownerProfileId, role: "OWNER" } });
    await tx.leagueInvite.create({ data: { leagueId: league.id, tokenHash: hashInviteToken(token), tokenCiphertext: ciphertext, expiresAt: null } });
    await enqueuePushEvent(tx, { userProfileId: ownerProfileId, leagueId: league.id, intent: "LEAGUE_ACTIVITY", eventKey: `league:${league.id}:created`, title: "Liga creada", body: "Tu nueva liga ya está disponible.", destination: `/app/ligas/${league.id}` });
    return { ...league, competitionSeasonIds: ids, primaryCompetitionSeasonId: primaryId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).then(result => { void wakePushWorker(); return result; });
}

export async function getInvite(actor: LeagueActor, leagueId: string) {
  if (!enabled()) fail("FEATURE_DISABLED");
  return retrySerializable(() => db.$transaction(async tx => {
    const ownerProfileId = await profileId(tx, actor, true);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM fantasy_leagues WHERE id=${leagueId}::uuid FOR UPDATE`);
    const league = await tx.fantasyLeague.findFirst({ where: { id: leagueId, ownerProfileId, status: "ACTIVE", legacyTeamId: null }, select: { competitionSeasonId: true } });
    if (!league) fail("LEAGUE_NOT_FOUND", 404);
    await requireFantasyCompetition(tx, league.competitionSeasonId);
    const active = await tx.leagueInvite.findFirst({ where: { leagueId, status: "ACTIVE" } });
    if (active?.tokenCiphertext) {
      try { return { token: decryptInviteToken(active.tokenCiphertext) }; }
      catch { fail("SERVICE_UNAVAILABLE", 503); }
    }
    if (active) await tx.leagueInvite.update({ where: { id: active.id }, data: { status: "REVOKED", revokedAt: new Date() } });
    const token = createInviteToken();
    await tx.leagueInvite.create({ data: { leagueId, tokenHash: hashInviteToken(token), tokenCiphertext: encryptInviteToken(token), expiresAt: null } });
    return { token };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function createInvite(actor: LeagueActor, leagueId: string) {
  if (!enabled()) fail("FEATURE_DISABLED");
  const token = createInviteToken();
  const ciphertext = encryptInviteToken(token);
  await retrySerializable(() => db.$transaction(async tx => {
    const owner = await profileId(tx, actor, true);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM fantasy_leagues WHERE id=${leagueId}::uuid FOR UPDATE`);
    const league = await tx.fantasyLeague.findFirst({ where: { id: leagueId, ownerProfileId: owner, status: "ACTIVE", legacyTeamId: null } });
    if (!league) fail("LEAGUE_NOT_FOUND", 404);
    await requireFantasyCompetition(tx, league.competitionSeasonId);
    await tx.leagueInvite.updateMany({ where: { leagueId, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: new Date() } });
    await tx.leagueInvite.create({ data: { leagueId, tokenHash: hashInviteToken(token), tokenCiphertext: ciphertext, expiresAt: null } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  return { token };
}

export async function invitePreview(token: string) {
  let hash: string;
  try { hash = hashInviteToken(token); } catch { return fail("INVITE_INVALID", 404); }
  const invite = await db.leagueInvite.findUnique({ where: { tokenHash: hash }, include: { league: { include: { competitionSeason: { include: { competition: true } }, selectedSeasons: { include: { competitionSeason: { include: { competition: true } } } }, memberships: { where: { status: "ACTIVE" } } } } } });
  if (!invite || invite.status !== "ACTIVE") fail("INVITE_INVALID", 404);
  if (invite.expiresAt && invite.expiresAt <= new Date()) fail("INVITE_INVALID", 404);
  if (invite.league.status !== "ACTIVE" || invite.league.legacyTeamId) fail("INVITE_INVALID", 404);
  await requireAvailableLeagueSeason(db, invite.league.id);
  const editions = invite.league.selectedSeasons.length ? invite.league.selectedSeasons.map(item => item.competitionSeason.competition.name) : [invite.league.competitionSeason.competition.name];
  return { name: invite.league.name, competition: editions.join(", "), members: invite.league.memberships.length, limit: invite.league.memberLimit, full: invite.league.memberships.length >= invite.league.memberLimit };
}

export async function joinLeagueByInvite(actor: LeagueActor, token: string) {
  if (!enabled()) fail("FEATURE_DISABLED");
  let hash: string;
  try { hash = hashInviteToken(token); } catch { return fail("INVITE_INVALID", 404); }
  const candidate = await db.leagueInvite.findUnique({ where: { tokenHash: hash }, select: { leagueId: true } });
  if (!candidate) fail("INVITE_INVALID", 404);
  return retrySerializable(() => db.$transaction(async tx => {
    const userProfileId = await profileId(tx, actor, true);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM fantasy_leagues WHERE id=${candidate.leagueId}::uuid FOR UPDATE`);
    const invite = await tx.leagueInvite.findUnique({ where: { tokenHash: hash } });
    if (!invite || invite.status !== "ACTIVE" || (invite.expiresAt && invite.expiresAt <= new Date())) fail("INVITE_INVALID", 404);
    const league = await tx.fantasyLeague.findUnique({ where: { id: invite.leagueId }, omit: { passwordHash: true, leagueCode: true } });
    if (!league || league.status !== "ACTIVE" || league.legacyTeamId) fail("INVITE_INVALID", 404);
    await requireLeagueFantasy(tx, league.id);
    const existing = await tx.leagueMembership.findUnique({ where: { leagueId_userProfileId: { leagueId: league.id, userProfileId } } });
    if (existing?.status === "ACTIVE") return { id: league.id, name: league.name };
    const count = await tx.leagueMembership.count({ where: { leagueId: league.id, status: "ACTIVE" } });
    if (count >= league.memberLimit) fail("LEAGUE_FULL");
    await tx.leagueMembership.upsert({ where: { leagueId_userProfileId: { leagueId: league.id, userProfileId } }, create: { leagueId: league.id, userProfileId }, update: { status: "ACTIVE", role: "MEMBER", leftAt: null, joinedAt: new Date() } });
    const profile = await tx.userProfile.findUnique({ where: { id: userProfileId }, select: { username: true, displayName: true } });
    await appendLeagueEvent(tx, { leagueId: league.id, type: "MEMBER_JOINED", actorProfileId: userProfileId, sourceType: "LEAGUE_MEMBERSHIP", sourceId: `${userProfileId}:${new Date().toISOString().slice(0, 10)}`, payload: { affectedName: profile?.username ? `@${profile.username}` : profile?.displayName ?? "Nuevo manager", destination: `/app/ligas/${league.id}?tab=members` } });
    await enqueuePushEvent(tx, { userProfileId, leagueId: league.id, intent: "LEAGUE_ACTIVITY", eventKey: `league:${league.id}:member:${userProfileId}:joined`, title: "Te has unido a la liga", body: "Ya puedes participar en la liga.", destination: `/app/ligas/${league.id}` });
    return { id: league.id, name: league.name };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })).then(result => { void wakePushWorker(); return result; });
}
export async function leaveLeague(actor: LeagueActor, leagueId: string) { if (!enabled()) fail("FEATURE_DISABLED"); return db.$transaction(async tx => { const userProfileId = await profileId(tx, actor, true); const member = await tx.leagueMembership.findUnique({ where: { leagueId_userProfileId: { leagueId, userProfileId } } }); if (!member || member.status !== "ACTIVE") fail("LEAGUE_NOT_FOUND", 404); await requireLeagueFantasy(tx,leagueId); if (member.role === "OWNER") fail("OWNER_CANNOT_LEAVE"); return tx.leagueMembership.update({ where: { id: member.id }, data: { status: "LEFT", leftAt: new Date() } }); }); }
export async function deleteLeague(actor: LeagueActor, leagueId: string, input: { expectedVersion: number; confirmation: string }) { if (!enabled()) fail("FEATURE_DISABLED"); return db.$transaction(async tx => { const ownerProfileId = await profileId(tx, actor, true); const league = await tx.fantasyLeague.findFirst({ where: { id: leagueId, ownerProfileId, status: "ACTIVE" }, include: { memberships: { where: { status: "ACTIVE" } } } }); if (!league) fail("LEAGUE_NOT_FOUND", 404); await requireFantasyCompetition(tx,league.competitionSeasonId); if (league.version !== input.expectedVersion) fail("VERSION_CONFLICT"); if (league.memberships.length > 1 && input.confirmation !== league.name) fail("CONFIRMATION_REQUIRED"); await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${leagueId}))`); await cancelLeagueMarketV2(tx, leagueId); await cancelLeagueNegotiations(tx, leagueId); await tx.leagueInvite.updateMany({ where: { leagueId, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: new Date() } }); return tx.fantasyLeague.update({ where: { id: leagueId, version: input.expectedVersion }, data: { status: "ARCHIVED", version: { increment: 1 } } }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
