import { leagueError, leagueOk, requireLeagueActor } from "../../../../server/private-league-http";
import { createLeague, listLeagues } from "../../../../server/private-leagues";
export async function GET() { try { return leagueOk(await listLeagues(await requireLeagueActor())); } catch (e) { return leagueError(e); } }
export async function POST(request: Request) { try { return leagueOk(await createLeague(await requireLeagueActor(), await request.json()), 201); } catch (e) { return leagueError(e); } }
