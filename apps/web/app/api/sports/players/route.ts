import { NextRequest, NextResponse } from "next/server";
import { listPlayers, pageNumber } from "../../../../src/server/sports";
import { rolloutProductBlockResponse } from "../../../../src/server/rollout";

export async function GET(request: NextRequest) {
  const blocked = await rolloutProductBlockResponse(); if (blocked) return blocked;
  const page = pageNumber(request.nextUrl.searchParams.get("page"));
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  return NextResponse.json(await listPlayers(page, query));
}
