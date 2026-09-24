import { timingSafeEqual } from "node:crypto";
import { advanceAllMarketV2 } from "../../../../src/server/market-v2";

async function run(request: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.MARKET_V2_JOB_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try { return Response.json(await advanceAllMarketV2()); }
  catch { return Response.json({ error: "MARKET_ADVANCE_FAILED" }, { status: 503 }); }
}
export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }
