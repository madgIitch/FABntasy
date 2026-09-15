import { heartbeatPresence } from "../../../../../src/server/social-league";
import { requireSocialActor, socialError, socialOk } from "../../../../../src/server/social-league-http";
export async function POST(request:Request,{params}:{params:Promise<{leagueId:string}>}){try{const actor=await requireSocialActor();const {leagueId}=await params;const body=await request.json() as {sessionId?:string};return socialOk(await heartbeatPresence(actor,leagueId,body.sessionId??""));}catch(error){return socialError(error);}}
