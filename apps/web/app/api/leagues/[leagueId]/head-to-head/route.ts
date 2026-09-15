import { getHeadToHead } from "../../../../../src/server/social-league";
import { requireSocialActor, socialError, socialOk } from "../../../../../src/server/social-league-http";
export async function GET(request:Request,{params}:{params:Promise<{leagueId:string}>}){try{const actor=await requireSocialActor();const {leagueId}=await params;const url=new URL(request.url);return socialOk(await getHeadToHead(actor,leagueId,url.searchParams.get("left")??"",url.searchParams.get("right")??""));}catch(error){return socialError(error);}}
