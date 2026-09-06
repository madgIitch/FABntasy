import { NextResponse } from "next/server";
import { createClient } from "../lib/supabase/server";
import { ROUND_RANKING_SCHEMA_VERSION, RoundRankingError } from "./round-rankings";

export async function requireRankingActor() { const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) throw new RoundRankingError("AUTH_REQUIRED", 401); return user.id; }
export const rankingOk = (data: unknown) => NextResponse.json({ schemaVersion: ROUND_RANKING_SCHEMA_VERSION, data, error: null });
export const rankingError = (error: unknown) => { const known = error instanceof RoundRankingError ? error : new RoundRankingError("INVALID_INPUT", 422);
  return NextResponse.json({ schemaVersion: ROUND_RANKING_SCHEMA_VERSION, data: null, error: { code: known.code } }, { status: known.status }); };
