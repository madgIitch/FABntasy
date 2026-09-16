import { NextResponse } from "next/server";
import { getServerUser } from "../lib/supabase/server";
import { FANTASY_LEAGUE_SCHEMA_VERSION } from "../../../../packages/domain/private-league";
import { LeagueServiceError } from "./private-leagues";
import { requireProductAccess } from "./rollout";
export async function requireLeagueActor(options: { onboarding?: boolean } = {}) { const user = await getServerUser(); if (!user) throw new LeagueServiceError("AUTH_REQUIRED", 401); if (!options.onboarding) await requireProductAccess(user.id); return { authUserId: user.id }; }
export const leagueOk = (data: unknown, status = 200) => NextResponse.json({ schemaVersion: FANTASY_LEAGUE_SCHEMA_VERSION, data, error: null }, { status });
export const leagueError = (error: unknown) => { const value=error as {code?:unknown;status?:unknown}; const known = error instanceof LeagueServiceError ? error : typeof value?.code==="string"&&typeof value?.status==="number"?{code:value.code,status:value.status}:new LeagueServiceError("INVALID_INPUT", 422); return NextResponse.json({ schemaVersion: FANTASY_LEAGUE_SCHEMA_VERSION, data: null, error: { code: known.code } }, { status: known.status }); };
