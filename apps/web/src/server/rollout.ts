import { db } from "./db";

export const ROLLOUT_STATES = ["PREVIEW", "OPEN"] as const;
export type RolloutState = typeof ROLLOUT_STATES[number];
export const ROLLOUT_BYPASS_USERNAMES = new Set(["pvto_pepe", "fvcking_pepe"]);

export class RolloutError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}

export type RolloutAccess = {
  state: RolloutState;
  version: number;
  isBypassed: boolean;
  isAdmin: boolean;
  profileId: string | null;
  available: boolean;
};

export function isRolloutBypass(username: string | null | undefined) {
  return Boolean(username && ROLLOUT_BYPASS_USERNAMES.has(username.normalize("NFKC").trim().toLowerCase()));
}

export async function getRolloutAccess(authUserId?: string | null): Promise<RolloutAccess> {
  try {
    const [setting, profile] = await Promise.all([
      db.rolloutSetting.findUnique({ where: { id: "global" }, select: { state: true, version: true } }),
      authUserId ? db.userProfile.findUnique({
        where: { authUserId },
        select: { id: true, username: true, adminGrants: { where: { role: "INGESTION_ADMIN", revokedAt: null }, take: 1, select: { id: true } } },
      }) : Promise.resolve(null),
    ]);
    const state: RolloutState = setting?.state === "OPEN" ? "OPEN" : "PREVIEW";
    return { state, version: setting?.version ?? 0, isBypassed: isRolloutBypass(profile?.username), isAdmin: Boolean(profile?.adminGrants.length), profileId: profile?.id ?? null, available: Boolean(setting) };
  } catch {
    return { state: "PREVIEW", version: 0, isBypassed: false, isAdmin: false, profileId: null, available: false };
  }
}

export async function requireProductAccess(authUserId: string) {
  const access = await getRolloutAccess(authUserId);
  if (access.state === "PREVIEW" && !access.isBypassed) throw new RolloutError("ROLLOUT_PREVIEW", 403);
  return access;
}

export async function rolloutProductBlockResponse() {
  try {
    const { getServerUser } = await import("../lib/supabase/server");
    const user = await getServerUser();
    const access = await getRolloutAccess(user?.id);
    if (access.state === "OPEN" || access.isBypassed) return null;
  } catch { /* fail closed */ }
  return Response.json({ error: { code: "ROLLOUT_PREVIEW" } }, { status: 403, headers: { "cache-control": "private, no-store" } });
}

export function parseRolloutUpdate(input: unknown) {
  const value = input as { state?: unknown; version?: unknown };
  if (!ROLLOUT_STATES.includes(value?.state as RolloutState) || !Number.isInteger(value?.version) || Number(value.version) < 0) throw new RolloutError("INVALID_ROLLOUT_UPDATE", 422);
  return { state: value.state as RolloutState, version: Number(value.version) };
}

export async function updateRollout(actorProfileId: string, input: unknown) {
  const next = parseRolloutUpdate(input);
  return db.$transaction(async tx => {
    const current = await tx.rolloutSetting.findUnique({ where: { id: "global" } });
    const currentVersion = current?.version ?? 0;
    if (currentVersion !== next.version) throw new RolloutError("ROLLOUT_VERSION_CONFLICT", 409);
    const updated = current
      ? await tx.rolloutSetting.update({ where: { id: "global", version: currentVersion }, data: { state: next.state, version: { increment: 1 }, updatedByProfileId: actorProfileId } })
      : await tx.rolloutSetting.create({ data: { id: "global", state: next.state, version: 1, updatedByProfileId: actorProfileId } });
    await tx.adminAuditEvent.create({ data: { actorProfileId, action: "ROLLOUT_STATE_CHANGE", resourceType: "ROLLOUT_SETTING", resourceId: "global", result: "SUCCESS", reason: `${current?.state ?? "MISSING"}->${updated.state}` } });
    return { state: updated.state as RolloutState, version: updated.version, updatedAt: updated.updatedAt.toISOString() };
  });
}
