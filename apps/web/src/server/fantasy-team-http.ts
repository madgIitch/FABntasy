import { NextResponse } from "next/server";
import { createClient } from "../lib/supabase/server";
import { FANTASY_TEAM_SCHEMA_VERSION } from "../../../../packages/domain/fantasy-team";
import { FantasyTeamServiceError, type TeamActor } from "./fantasy-team";

export async function requireFantasyActor(): Promise<TeamActor> {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) throw new FantasyTeamServiceError("AUTH_REQUIRED", 401);
  return { authUserId: user.id };
}

export const fantasyOk = (data: unknown, status = 200) => NextResponse.json({ schemaVersion: FANTASY_TEAM_SCHEMA_VERSION, data, error: null }, { status });

export function fantasyError(error: unknown) {
  const known = error instanceof FantasyTeamServiceError ? error : new FantasyTeamServiceError("INVALID_INPUT", 422);
  return NextResponse.json({ schemaVersion: FANTASY_TEAM_SCHEMA_VERSION, data: null, error: { code: known.code, message: known.message } }, { status: known.status });
}
