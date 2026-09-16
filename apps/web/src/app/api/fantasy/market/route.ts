import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { executeMarket, FANTASY_MARKET_SCHEMA_VERSION, getMarketContext, MarketServiceError } from "../../../../server/fantasy-market";
import { requireProductAccess } from "../../../../server/rollout";

async function actor(){const {data:{user}}=await (await createClient()).auth.getUser();if(!user)throw new MarketServiceError("AUTH_REQUIRED",401);await requireProductAccess(user.id);return {authUserId:user.id};}
const ok=(data:unknown,status=200)=>NextResponse.json({schemaVersion:FANTASY_MARKET_SCHEMA_VERSION,data,error:null},{status});
const bad=(error:unknown)=>{const value=error as {code?:unknown;status?:unknown};const known=error instanceof MarketServiceError?error:typeof value?.code==="string"&&typeof value?.status==="number"?{code:value.code,status:value.status}:new MarketServiceError("INVALID_INPUT",422);return NextResponse.json({schemaVersion:FANTASY_MARKET_SCHEMA_VERSION,data:null,error:{code:known.code}},{status:known.status});};
export async function GET(request:Request){try{const leagueId=new URL(request.url).searchParams.get("leagueId");if(!leagueId)throw new MarketServiceError("INVALID_INPUT",422);return ok(await getMarketContext(await actor(),leagueId));}catch(error){return bad(error)}}
export async function POST(request:Request){try{return ok(await executeMarket(await actor(),await request.json()),201)}catch(error){return bad(error)}}
