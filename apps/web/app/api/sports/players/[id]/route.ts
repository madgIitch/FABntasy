import { NextResponse } from "next/server";
import { getPlayer } from "../../../../../src/server/sports";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const player = await getPlayer((await params).id);
  if (!player) return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  return NextResponse.json(player);
}
