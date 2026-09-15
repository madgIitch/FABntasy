import { toggleReaction } from "../../../../../../../src/server/social-league";
import { requireSocialActor, socialError, socialOk } from "../../../../../../../src/server/social-league-http";
export async function PUT(request:Request,{params}:{params:Promise<{leagueId:string;eventId:string}>}){try{const actor=await requireSocialActor();const {leagueId,eventId}=await params;const body=await request.json() as {emoji?:unknown};return socialOk(await toggleReaction(actor,leagueId,eventId,body.emoji));}catch(error){return socialError(error);}}
