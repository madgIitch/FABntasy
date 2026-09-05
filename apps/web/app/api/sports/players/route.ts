import { NextRequest, NextResponse } from "next/server";
import { listPlayers, pageNumber } from "../../../../src/server/sports";

export async function GET(request: NextRequest) {
  const page = pageNumber(request.nextUrl.searchParams.get("page"));
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  return NextResponse.json(await listPlayers(page, query));
}
