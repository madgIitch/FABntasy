import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { executeMarketNegotiation, getMarketNegotiationsForActor, MarketNegotiationError, type NegotiationInput } from "../../../../../server/market-negotiations";
import { requireProductAccess } from "../../../../../server/rollout";

async function actor() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) throw new MarketNegotiationError("AUTH_REQUIRED", 401);
  await requireProductAccess(user.id);
  return user.id;
}
function errorResponse(error: unknown) {
  const known = error instanceof MarketNegotiationError ? error : null;
  return NextResponse.json({ error: { code: known?.code ?? "NEGOTIATION_FAILED", details: known?.details } }, { status: known?.status ?? 500 });
}
export async function GET(request: Request) {
  try {
    const leagueId = new URL(request.url).searchParams.get("leagueId");
    if (!leagueId) throw new MarketNegotiationError("INVALID_INPUT", 422);
    return NextResponse.json({ data: await getMarketNegotiationsForActor(await actor(), leagueId) });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try { return NextResponse.json({ data: await executeMarketNegotiation(await actor(), await request.json() as NegotiationInput) }, { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
