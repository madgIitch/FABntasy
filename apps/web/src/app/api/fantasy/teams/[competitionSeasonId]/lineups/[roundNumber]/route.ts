import { type NextRequest } from "next/server";
import { fantasyError, fantasyOk, requireFantasyActor } from "../../../../../../../server/fantasy-team-http";
import { putLineup } from "../../../../../../../server/fantasy-team";

type Context = { params: Promise<{ competitionSeasonId: string; roundNumber: string }> };

export async function PUT(request: NextRequest, context: Context) {
  try {
    const actor = await requireFantasyActor();
    const { competitionSeasonId, roundNumber } = await context.params;
    return fantasyOk(await putLineup(actor, competitionSeasonId, Number(roundNumber), await request.json()));
  } catch (error) { return fantasyError(error); }
}
