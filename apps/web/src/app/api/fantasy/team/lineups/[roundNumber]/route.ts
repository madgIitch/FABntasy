import { type NextRequest } from "next/server";
import { fantasyError, fantasyOk, requireFantasyActor } from "../../../../../../server/fantasy-team-http";
import { getFantasyTeam, putLineup } from "../../../../../../server/fantasy-team";

type Context = { params: Promise<{ roundNumber: string }> };

function parseRound(value: string): number {
  const roundNumber = Number(value);
  if (!Number.isInteger(roundNumber) || roundNumber < 1) throw new Error("invalid roundNumber");
  return roundNumber;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireFantasyActor();
    const competitionSeasonId = request.nextUrl.searchParams.get("competitionSeasonId");
    if (!competitionSeasonId) throw new Error("competitionSeasonId is required");
    return fantasyOk(await getFantasyTeam(actor, competitionSeasonId, parseRound((await context.params).roundNumber)));
  } catch (error) { return fantasyError(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const actor = await requireFantasyActor();
    const body = await request.json();
    if (typeof body?.competitionSeasonId !== "string") throw new Error("competitionSeasonId is required");
    return fantasyOk(await putLineup(actor, body.competitionSeasonId, parseRound((await context.params).roundNumber), body));
  } catch (error) { return fantasyError(error); }
}
