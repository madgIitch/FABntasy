import { leagueError, leagueOk, requireLeagueActor } from "../../../../../server/private-league-http";
import { deleteLeague, getLeague } from "../../../../../server/private-leagues";
export async function GET(_: Request, { params }: { params: Promise<{ leagueId: string }> }) { try { return leagueOk(await getLeague(await requireLeagueActor(), (await params).leagueId)); } catch (e) { return leagueError(e); } }
export async function DELETE(request: Request, { params }: { params: Promise<{ leagueId: string }> }) { try { return leagueOk(await deleteLeague(await requireLeagueActor(), (await params).leagueId, await request.json())); } catch (e) { return leagueError(e); } }
