import { adminFailure, adminResponse, assertAdminOrigin, requireAdminActor } from "../../../../../../../src/server/ingestion-admin-http";
import { disableCompetitionFantasy, enableCompetitionFantasy } from "../../../../../../../src/server/ingestion-admin";
import { revalidateTag } from "next/cache";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertAdminOrigin(request);
    const [{ id }, actor] = await Promise.all([params, requireAdminActor()]);
    const result = await enableCompetitionFantasy(actor, id);
    revalidateTag("fantasy-sports");
    return adminResponse(result);
  } catch (error) {
    return adminFailure(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertAdminOrigin(request);
    const [{ id }, actor] = await Promise.all([params, requireAdminActor()]);
    const body = await request.json().catch(() => ({})) as { confirmation?: unknown };
    const result = await disableCompetitionFantasy(actor, id, typeof body.confirmation === "string" ? body.confirmation : "");
    revalidateTag("fantasy-sports");
    return adminResponse(result);
  } catch (error) {
    return adminFailure(error);
  }
}
