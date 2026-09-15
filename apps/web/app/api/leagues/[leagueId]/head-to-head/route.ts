import { getHeadToHead } from "../../../../../src/server/social-league";
import { managerContext } from "../../../../../src/server/manager-profile";
import { requireSocialActor, socialError, socialOk } from "../../../../../src/server/social-league-http";
export async function GET(request:Request,{params}:{params:Promise<{leagueId:string}>}){try{const actor=await requireSocialActor();const {leagueId}=await params;const target=await managerContext(actor,leagueId,new URL(request.url).searchParams.get("manager")??"");return socialOk(await getHeadToHead(actor,leagueId,target.actorProfileId,target.target.userProfileId));}catch(error){return socialError(error);}}
