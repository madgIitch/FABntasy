import { adminFailure, adminResponse, requireAdminActor } from "../../../../src/server/ingestion-admin-http";
import { getObservabilityStatus } from "../../../../src/server/observability";
export async function GET(){try{await requireAdminActor();return adminResponse(await getObservabilityStatus())}catch(error){return adminFailure(error)}}
