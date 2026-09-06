import { leagueError, leagueOk, requireLeagueActor } from "../../../../../../server/private-league-http";
import { leaveLeague } from "../../../../../../server/private-leagues";
export async function POST(_: Request, { params }: { params: Promise<{ leagueId: string }> }) { try { return leagueOk(await leaveLeague(await requireLeagueActor(), (await params).leagueId)); } catch (e) { return leagueError(e); } }
