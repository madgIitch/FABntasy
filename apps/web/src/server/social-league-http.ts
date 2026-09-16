import { NextResponse } from "next/server";
import { SOCIAL_LEAGUE_SCHEMA_VERSION } from "../../../../packages/domain/social-league";
import { getServerUser } from "../lib/supabase/server";
import { SocialLeagueError } from "./social-league";
import { requireProductAccess } from "./rollout";
export async function requireSocialActor(){const user=await getServerUser();if(!user)throw new SocialLeagueError("AUTH_REQUIRED",401);await requireProductAccess(user.id);return {authUserId:user.id};}
export const socialOk=(data:unknown,status=200)=>NextResponse.json({schemaVersion:SOCIAL_LEAGUE_SCHEMA_VERSION,data,error:null},{status});
export const socialError=(error:unknown)=>{const value=error as {code?:unknown;status?:unknown};const known=error instanceof SocialLeagueError?error:typeof value?.code==="string"&&typeof value?.status==="number"?{code:value.code,status:value.status}:new SocialLeagueError("INVALID_INPUT",422);return NextResponse.json({schemaVersion:SOCIAL_LEAGUE_SCHEMA_VERSION,data:null,error:{code:known.code}},{status:known.status});};
