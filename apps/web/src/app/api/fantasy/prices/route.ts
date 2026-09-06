import { NextRequest, NextResponse } from "next/server";
import { getPlayerPrices } from "../../../../server/player-pricing";

export async function GET(request: NextRequest) {
  const competitionSeasonId = request.nextUrl.searchParams.get("competitionSeasonId");
  if (!competitionSeasonId) return NextResponse.json({ error: { code: "COMPETITION_SEASON_REQUIRED" } }, { status: 400 });
  const items = await getPlayerPrices({ competitionSeasonId, playerRegistrationId: request.nextUrl.searchParams.get("playerRegistrationId") ?? undefined,
    algorithmVersion: request.nextUrl.searchParams.get("algorithmVersion") ?? undefined });
  return NextResponse.json({ schemaVersion: "player-price-api.v1", items });
}
