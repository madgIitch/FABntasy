import { type NextRequest } from "next/server";
import { fantasyError, fantasyOk, requireFantasyActor } from "../../../../../../src/server/fantasy-team-http";
import { getFantasyTeam, putLineup } from "../../../../../../src/server/fantasy-team";

type Context = { params: Promise<{ roundNumber: string }> };
const round = (value: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error("invalid roundNumber");
  return parsed;
};

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireFantasyActor();
    const competitionSeasonId = request.nextUrl.searchParams.get("competitionSeasonId");
    if (!competitionSeasonId) throw new Error("competitionSeasonId is required");
    return fantasyOk(await getFantasyTeam(actor, competitionSeasonId, round((await context.params).roundNumber)));
  } catch (error) { return fantasyError(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const actor = await requireFantasyActor();
    const body = await request.json();
    if (typeof body?.competitionSeasonId !== "string") throw new Error("competitionSeasonId is required");
    return fantasyOk(await putLineup(actor, body.competitionSeasonId, round((await context.params).roundNumber), body));
  } catch (error) { return fantasyError(error); }
}
