import { getMembers } from "../../../../../src/server/social-league";
import { requireSocialActor, socialError, socialOk } from "../../../../../src/server/social-league-http";
export async function GET(request:Request,{params}:{params:Promise<{leagueId:string}>}){try{const actor=await requireSocialActor();const {leagueId}=await params;const url=new URL(request.url);return socialOk(await getMembers(actor,leagueId,{cursor:url.searchParams.get("cursor"),limit:Number(url.searchParams.get("limit")||20)}));}catch(error){return socialError(error);}}
