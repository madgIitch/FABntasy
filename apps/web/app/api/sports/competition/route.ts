import { NextResponse } from "next/server";
import { getCompetitionOverview } from "../../../../src/server/sports";

export async function GET() {
  const competition = await getCompetitionOverview();
  return competition ? NextResponse.json(competition) : NextResponse.json({ error: "competition_not_available" }, { status: 404 });
}
