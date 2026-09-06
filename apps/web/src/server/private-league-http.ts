import { NextResponse } from "next/server";
import { createClient } from "../lib/supabase/server";
import { FANTASY_LEAGUE_SCHEMA_VERSION } from "../../../../packages/domain/private-league";
import { LeagueServiceError } from "./private-leagues";
export async function requireLeagueActor() { const { data: { user } } = await (await createClient()).auth.getUser(); if (!user) throw new LeagueServiceError("AUTH_REQUIRED", 401); return { authUserId: user.id }; }
export const leagueOk = (data: unknown, status = 200) => NextResponse.json({ schemaVersion: FANTASY_LEAGUE_SCHEMA_VERSION, data, error: null }, { status });
export const leagueError = (error: unknown) => { const known = error instanceof LeagueServiceError ? error : new LeagueServiceError("INVALID_INPUT", 422); return NextResponse.json({ schemaVersion: FANTASY_LEAGUE_SCHEMA_VERSION, data: null, error: { code: known.code } }, { status: known.status }); };
