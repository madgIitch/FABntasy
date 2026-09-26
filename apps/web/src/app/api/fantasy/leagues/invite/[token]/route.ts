import { leagueError, leagueOk, requireLeagueActor } from "../../../../../../server/private-league-http";
import { invitePreview, joinLeagueByInvite } from "../../../../../../server/private-leagues";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try { const response = leagueOk(await invitePreview((await params).token)); response.headers.set("Cache-Control", "no-store"); return response; }
  catch (error) { return leagueError(error); }
}
export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try { return leagueOk(await joinLeagueByInvite(await requireLeagueActor({ onboarding: true }), (await params).token)); }
  catch (error) { return leagueError(error); }
}
