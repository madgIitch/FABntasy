import { type NextRequest } from "next/server";
import { fantasyError, fantasyOk, requireFantasyActor } from "../../../../../server/fantasy-team-http";
import { getFantasyTeam, putRoster } from "../../../../../server/fantasy-team";

type Context = { params: Promise<{ competitionSeasonId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireFantasyActor();
    const { competitionSeasonId } = await context.params;
    const round = request.nextUrl.searchParams.get("roundNumber");
    const roundNumber = round === null ? undefined : Number(round);
    if (roundNumber !== undefined && (!Number.isInteger(roundNumber) || roundNumber < 1)) throw new Error("invalid round");
    return fantasyOk(await getFantasyTeam(actor, competitionSeasonId, roundNumber));
  } catch (error) { return fantasyError(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const actor = await requireFantasyActor();
    const { competitionSeasonId } = await context.params;
    const body = await request.json();
    const result = await putRoster(actor, competitionSeasonId, body);
    return fantasyOk(result.team, result.created ? 201 : 200);
  } catch (error) { return fantasyError(error); }
}
