import { NextResponse } from "next/server";
import { getCompetitionOverview } from "../../../../src/server/sports";
import { rolloutProductBlockResponse } from "../../../../src/server/rollout";

export async function GET() {
  const blocked = await rolloutProductBlockResponse(); if (blocked) return blocked;
  const competition = await getCompetitionOverview();
  return competition ? NextResponse.json(competition) : NextResponse.json({ error: "competition_not_available" }, { status: 404 });
}
