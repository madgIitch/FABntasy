import { adminFailure, adminResponse, assertAdminOrigin, requireAdminActor } from "../../../../src/server/ingestion-admin-http";
import { listRevisions, previewRevision } from "../../../../src/server/sports-data-revisions";
export async function GET(){try{await requireAdminActor();return adminResponse(await listRevisions())}catch(error){return adminFailure(error)}}
export async function POST(request:Request){try{assertAdminOrigin(request);return adminResponse(await previewRevision(await requireAdminActor(),await request.json()),201)}catch(error){return adminFailure(error)}}
