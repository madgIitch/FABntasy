import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { advanceFantasyLifecycle } from "../../../../../server/fantasy-lifecycle";

function authorized(request: NextRequest) {
  const secret = process.env.CANASTIO_INTERNAL_JOB_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !supplied) return false;
  const expectedHash = createHash("sha256").update(secret).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ code: "INVALID_JSON" }, { status: 400 }); }
  const competitionSeasonId = typeof body === "object" && body !== null && "competitionSeasonId" in body
    ? String((body as { competitionSeasonId: unknown }).competitionSeasonId) : "";
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(competitionSeasonId)) {
    return NextResponse.json({ code: "INVALID_COMPETITION_SEASON" }, { status: 422 });
  }
  try {
    return NextResponse.json({ schemaVersion: "canastio-fantasy-lifecycle.v1", ...(await advanceFantasyLifecycle(competitionSeasonId)) });
  } catch (error) {
    console.error("[fantasy-lifecycle] failed", { name: error instanceof Error ? error.name : "Unknown" });
    return NextResponse.json({ code: "LIFECYCLE_FAILED" }, { status: 500 });
  }
}
