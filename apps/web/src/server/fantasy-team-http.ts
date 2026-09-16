import { NextResponse } from "next/server";
import { getServerUser } from "../lib/supabase/server";
import { FANTASY_TEAM_SCHEMA_VERSION } from "../../../../packages/domain/fantasy-team";
import { FantasyTeamServiceError, type TeamActor } from "./fantasy-team";
import { requireProductAccess } from "./rollout";

export async function requireFantasyActor(): Promise<TeamActor> {
  const user = await getServerUser();
  if (!user) throw new FantasyTeamServiceError("AUTH_REQUIRED", 401);
  await requireProductAccess(user.id);
  return { authUserId: user.id };
}

export const fantasyOk = (data: unknown, status = 200) => NextResponse.json({ schemaVersion: FANTASY_TEAM_SCHEMA_VERSION, data, error: null }, { status });

export function fantasyError(error: unknown) {
  const value=error as {code?:unknown;status?:unknown;message?:unknown};
  const known = error instanceof FantasyTeamServiceError ? error : typeof value?.code==="string"&&typeof value?.status==="number"?{code:value.code,status:value.status,message:String(value.message??value.code)}:new FantasyTeamServiceError("INVALID_INPUT", 422);
  return NextResponse.json({ schemaVersion: FANTASY_TEAM_SCHEMA_VERSION, data: null, error: { code: known.code, message: known.message } }, { status: known.status });
}
