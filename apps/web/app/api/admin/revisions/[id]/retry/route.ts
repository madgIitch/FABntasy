import { adminFailure, adminResponse, assertAdminOrigin, requireAdminActor } from "../../../../../../src/server/ingestion-admin-http";
import { retryRevisionRecomputation } from "../../../../../../src/server/sports-data-revisions";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{assertAdminOrigin(request);return adminResponse(await retryRevisionRecomputation(await requireAdminActor(),(await params).id))}catch(error){return adminFailure(error)}}
