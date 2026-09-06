import { leagueError, leagueOk, requireLeagueActor } from "../../../../../../server/private-league-http";
import { createInvite } from "../../../../../../server/private-leagues";
export async function POST(_: Request, { params }: { params: Promise<{ leagueId: string }> }) { try { return leagueOk(await createInvite(await requireLeagueActor(), (await params).leagueId), 201); } catch (e) { return leagueError(e); } }
