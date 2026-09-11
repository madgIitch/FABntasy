import { adminFailure, adminResponse, requireAdminActor } from "../../../../src/server/ingestion-admin-http";
import { getIngestionDashboard, listRawPayloads } from "../../../../src/server/ingestion-admin";
export async function GET(){try{const actor=await requireAdminActor();const [dashboard,raw]=await Promise.all([getIngestionDashboard(actor),listRawPayloads()]);return adminResponse({...dashboard,raw})}catch(error){return adminFailure(error)}}
