import { adminFailure, adminResponse, assertAdminOrigin, requireAdminActor } from "../../../../../../src/server/ingestion-admin-http";
import { setCompetitionMonitoring } from "../../../../../../src/server/ingestion-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertAdminOrigin(request);
    const [{ id }, body, actor] = await Promise.all([params, request.json(), requireAdminActor()]);
    return adminResponse(await setCompetitionMonitoring(actor, id, (body as { monitored?: unknown }).monitored as boolean));
  } catch (error) {
    return adminFailure(error);
  }
}
