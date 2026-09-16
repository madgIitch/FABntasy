import { adminFailure, adminResponse, requireAdminActor } from "../../../../../src/server/ingestion-admin-http";
import { getMonitoredCompetitionTeamIndexes } from "../../../../../src/server/ingestion-admin";

export async function GET() {
  try {
    await requireAdminActor();
    return adminResponse({ competitions: await getMonitoredCompetitionTeamIndexes() });
  } catch (error) {
    return adminFailure(error);
  }
}
