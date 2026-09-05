import { NextRequest, NextResponse } from "next/server";
import { listGames, pageNumber } from "../../../../src/server/sports";

export async function GET(request: NextRequest) {
  const page = pageNumber(request.nextUrl.searchParams.get("page"));
  const roundValue = Number.parseInt(request.nextUrl.searchParams.get("round") ?? "", 10);
  return NextResponse.json(await listGames(page, Number.isFinite(roundValue) ? roundValue : undefined));
}
