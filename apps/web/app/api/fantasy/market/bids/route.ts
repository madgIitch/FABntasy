import { createClient } from "../../../../../src/lib/supabase/server";
import { getMarketV2ForActor, MarketV2Error, submitMarketV2Bid } from "../../../../../src/server/market-v2";
import { requireProductAccess } from "../../../../../src/server/rollout";

async function actor() { const { data: { user } } = await (await createClient()).auth.getUser(); if (!user) throw new MarketV2Error("AUTH_REQUIRED", 401); await requireProductAccess(user.id); return user.id; }
function failure(error: unknown) { const value = error as { code?: string; status?: number }; return Response.json({ error: { code: value.code ?? "INTERNAL_ERROR" } }, { status: value.status ?? 500 }); }
export async function GET(request: Request) { try { const leagueId = new URL(request.url).searchParams.get("leagueId"); if (!leagueId) throw new MarketV2Error("INVALID_INPUT", 422); return Response.json({ schemaVersion: "market-v2.v1", data: await getMarketV2ForActor(await actor(), leagueId) }); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { const result = await submitMarketV2Bid(await actor(), await request.json()); return Response.json({ schemaVersion: "market-v2.v1", data: result }, { status: 201 }); } catch (error) { return failure(error); } }
