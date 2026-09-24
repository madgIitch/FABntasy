import { assertAdminOrigin, requireAdminActor, adminResponse, adminFailure } from "../../../../src/server/ingestion-admin-http";
import { marketV2State, startMarketV2 } from "../../../../src/server/market-v2";

export async function GET() { try { await requireAdminActor(); return adminResponse(await marketV2State()); } catch (error) { return adminFailure(error); } }
export async function POST(request: Request) { try { assertAdminOrigin(request); return adminResponse(await startMarketV2(await requireAdminActor())); } catch (error) { return adminFailure(error); } }
