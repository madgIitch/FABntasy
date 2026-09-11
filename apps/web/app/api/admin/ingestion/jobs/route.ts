import { adminFailure, adminResponse, assertAdminOrigin, requireAdminActor } from "../../../../../src/server/ingestion-admin-http";
import { enqueueIngestionJob } from "../../../../../src/server/ingestion-admin";
export async function POST(request:Request){try{assertAdminOrigin(request);return adminResponse(await enqueueIngestionJob(await requireAdminActor(),await request.json()),202)}catch(error){return adminFailure(error)}}
