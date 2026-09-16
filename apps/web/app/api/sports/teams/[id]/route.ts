import { NextResponse } from "next/server";
import { getTeam } from "../../../../../src/server/sports";
import { rolloutProductBlockResponse } from "../../../../../src/server/rollout";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = await rolloutProductBlockResponse(); if (blocked) return blocked;
  const team = await getTeam((await params).id);
  if (!team) return NextResponse.json({ error: "team_not_found" }, { status: 404 });
  return NextResponse.json(team);
}
