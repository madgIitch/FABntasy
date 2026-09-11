import { adminFailure, adminResponse, requireAdminActor } from "../../../../../../src/server/ingestion-admin-http";
import { getRawPayload } from "../../../../../../src/server/ingestion-admin";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;return adminResponse(await getRawPayload(await requireAdminActor(),id))}catch(error){return adminFailure(error)}}
