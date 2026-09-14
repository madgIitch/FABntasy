import { createClient } from "../../../../src/lib/supabase/server";
import { NotificationError, sendDeviceTest } from "../../../../src/server/notifications";
import { createWebPushSender } from "../../../../src/server/web-push-sender";

const attempts=new Map<string,{count:number;since:number}>();
function sameOrigin(request:Request){const origin=request.headers.get("origin");return !origin||origin===new URL(request.url).origin}
export async function POST(request:Request){try{if(!sameOrigin(request))throw new NotificationError("INVALID_ORIGIN",403);const{data:{user}}=await(await createClient()).auth.getUser();if(!user)throw new NotificationError("UNAUTHORIZED",401);const now=Date.now(),prior=attempts.get(user.id);if(prior&&now-prior.since<3_600_000&&prior.count>=3)throw new NotificationError("RATE_LIMITED",429);attempts.set(user.id,!prior||now-prior.since>=3_600_000?{count:1,since:now}:{...prior,count:prior.count+1});const body=await request.json();if(body&&typeof body==="object"&&"userId" in body)throw new NotificationError("CLIENT_IDENTITY_FORBIDDEN");return Response.json({schemaVersion:"push-test.v1",data:await sendDeviceTest(user.id,body?.deviceId,createWebPushSender())},{status:202})}catch(error){const known=error instanceof NotificationError;return Response.json({error:known?error.code:"PUSH_TEST_FAILED"},{status:known?error.status:500})}}
