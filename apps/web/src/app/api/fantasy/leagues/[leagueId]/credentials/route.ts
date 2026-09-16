import { leagueError, leagueOk, requireLeagueActor } from "../../../../../../server/private-league-http";
import { updateLeaguePassword } from "../../../../../../server/private-leagues";
export async function PUT(request:Request,{params}:{params:Promise<{leagueId:string}>}){try{return leagueOk(await updateLeaguePassword(await requireLeagueActor({ onboarding: true }),(await params).leagueId,(await request.json()).password))}catch(error){return leagueError(error)}}
