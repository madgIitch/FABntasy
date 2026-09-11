import { adminFailure, adminResponse, assertAdminOrigin, requireAdminActor } from "../../../../../../src/server/ingestion-admin-http";
import { previewReversal } from "../../../../../../src/server/sports-data-revisions";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{assertAdminOrigin(request);const body=await request.json();return adminResponse(await previewReversal(await requireAdminActor(),(await params).id,String(body.reason??"")),201)}catch(error){return adminFailure(error)}}
