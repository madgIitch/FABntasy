import { LeagueServiceError } from "../../../../../server/private-leagues";
import { leagueError, leagueOk, requireLeagueActor } from "../../../../../server/private-league-http";
import { joinLeague } from "../../../../../server/private-leagues";
export async function POST(request: Request) { const { token } = await request.json(); try { return leagueOk(await joinLeague(await requireLeagueActor(), token)); } catch (e) { const response=leagueError(e); if(e instanceof LeagueServiceError&&e.code==="AUTH_REQUIRED"&&typeof token==="string") response.cookies.set("league_invite_intent",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:86400}); return response; } }
