import { MANAGER_PROFILE_SCHEMA_VERSION } from "../../../../../../../../packages/domain/manager-profile";
import { getManagerProfile } from "../../../../../../src/server/manager-profile";
import { requireSocialActor, socialError } from "../../../../../../src/server/social-league-http";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ leagueId: string; publicManagerId: string }> }) {
  try {
    const actor = await requireSocialActor();
    const value = await params;
    return NextResponse.json({ schemaVersion: MANAGER_PROFILE_SCHEMA_VERSION, data: await getManagerProfile(actor, value.leagueId, value.publicManagerId), error: null });
  } catch (error) { return socialError(error); }
}
