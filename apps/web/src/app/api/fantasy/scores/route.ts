import { NextRequest, NextResponse } from "next/server";
import { getFantasyScores } from "../../../../server/fantasy-scoring";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const rulesetId = query.get("rulesetId") ?? undefined;
  const rulesetVersion = query.get("rulesetVersion") ?? undefined;
  if (!rulesetId && !rulesetVersion) return NextResponse.json({ code: "RULESET_VERSION_REQUIRED" }, { status: 400 });
  const items = await getFantasyScores({ playerId: query.get("playerId") ?? undefined, gameId: query.get("gameId") ?? undefined, rulesetId, rulesetVersion });
  return NextResponse.json({ schemaVersion: "fantasy-score-api.v1", items });
}
