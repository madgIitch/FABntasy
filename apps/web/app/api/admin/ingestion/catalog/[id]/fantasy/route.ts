import { adminFailure, adminResponse, assertAdminOrigin, requireAdminActor } from "../../../../../../../src/server/ingestion-admin-http";
import { enableCompetitionFantasy } from "../../../../../../../src/server/ingestion-admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertAdminOrigin(request);
    const [{ id }, actor] = await Promise.all([params, requireAdminActor()]);
    return adminResponse(await enableCompetitionFantasy(actor, id));
  } catch (error) {
    return adminFailure(error);
  }
}
