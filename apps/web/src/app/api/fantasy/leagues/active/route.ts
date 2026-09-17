import { leagueError, leagueOk, requireLeagueActor } from "../../../../../server/private-league-http";
import { selectActiveLeague } from "../../../../../server/private-leagues";
import { cacheTags, invalidateCache } from "../../../../../server/performance";

export async function POST(request: Request) {
  try {
    const input = await request.json() as { leagueId?: unknown };
    const result = await selectActiveLeague(await requireLeagueActor(), String(input.leagueId ?? ""));
    invalidateCache(cacheTags({ leagueId: result.activeLeagueId }));
    return leagueOk(result);
  } catch (error) {
    return leagueError(error);
  }
}
