import { leagueError, leagueOk, requireLeagueActor } from "../../../../../server/private-league-http";
import { selectActiveLeague } from "../../../../../server/private-leagues";

export async function POST(request: Request) {
  try {
    const input = await request.json() as { leagueId?: unknown };
    return leagueOk(await selectActiveLeague(await requireLeagueActor(), String(input.leagueId ?? "")));
  } catch (error) {
    return leagueError(error);
  }
}
