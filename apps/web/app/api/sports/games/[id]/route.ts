import { NextResponse } from "next/server";
import { getGame } from "../../../../../src/server/sports";
import { rolloutProductBlockResponse } from "../../../../../src/server/rollout";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = await rolloutProductBlockResponse(); if (blocked) return blocked;
  const game = await getGame((await params).id);
  if (!game) return NextResponse.json({ error: "game_not_found" }, { status: 404 });
  return NextResponse.json(game);
}
