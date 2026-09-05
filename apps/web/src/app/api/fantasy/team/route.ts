import { type NextRequest } from "next/server";
import { fantasyError, fantasyOk, requireFantasyActor } from "../../../../server/fantasy-team-http";
import { getFantasyTeam, putRoster } from "../../../../server/fantasy-team";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireFantasyActor();
    const competitionSeasonId = request.nextUrl.searchParams.get("competitionSeasonId");
    if (!competitionSeasonId) throw new Error("competitionSeasonId is required");
    return fantasyOk(await getFantasyTeam(actor, competitionSeasonId));
  } catch (error) { return fantasyError(error); }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await requireFantasyActor();
    const body = await request.json();
    if (typeof body?.competitionSeasonId !== "string") throw new Error("competitionSeasonId is required");
    const result = await putRoster(actor, body.competitionSeasonId, body);
    return fantasyOk(result.team, result.created ? 201 : 200);
  } catch (error) { return fantasyError(error); }
}
