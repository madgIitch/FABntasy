import { adminFailure, adminResponse, assertAdminOrigin, requireAdminActor } from "../../../../src/server/ingestion-admin-http";
import { getRolloutAccess, RolloutError, updateRollout } from "../../../../src/server/rollout";

export async function GET() { try { await requireAdminActor(); const rollout = await getRolloutAccess(); return adminResponse({ state: rollout.state, version: rollout.version, available: rollout.available }); } catch (error) { return adminFailure(error); } }
export async function PUT(request: Request) { try { assertAdminOrigin(request); return adminResponse(await updateRollout(await requireAdminActor(), await request.json())); } catch (error) { if (error instanceof RolloutError) return Response.json({ error: error.code }, { status: error.status }); return adminFailure(error); } }
