import { NextResponse } from "next/server";
import { getServerUser } from "../lib/supabase/server";
import { ROUND_RANKING_SCHEMA_VERSION, RoundRankingError } from "./round-rankings";
import { requireProductAccess } from "./rollout";

export async function requireRankingActor() { const user = await getServerUser();
  if (!user) throw new RoundRankingError("AUTH_REQUIRED", 401); await requireProductAccess(user.id); return user.id; }
export const rankingOk = (data: unknown) => NextResponse.json({ schemaVersion: ROUND_RANKING_SCHEMA_VERSION, data, error: null });
export const rankingError = (error: unknown) => { const value=error as {code?:unknown;status?:unknown}; const known = error instanceof RoundRankingError ? error : typeof value?.code==="string"&&typeof value?.status==="number"?{code:value.code,status:value.status}:new RoundRankingError("INVALID_INPUT", 422);
  return NextResponse.json({ schemaVersion: ROUND_RANKING_SCHEMA_VERSION, data: null, error: { code: known.code } }, { status: known.status }); };
