import { leagueError, leagueOk, requireLeagueActor } from "../../../../../../server/private-league-http";
import { createInvite, getInvite } from "../../../../../../server/private-leagues";
const privateResult = (value: unknown, status = 200) => { const response = leagueOk(value, status); response.headers.set("Cache-Control", "private, no-store"); return response; };
export async function GET(_: Request, { params }: { params: Promise<{ leagueId: string }> }) { try { return privateResult(await getInvite(await requireLeagueActor({ onboarding: true }), (await params).leagueId)); } catch (e) { return leagueError(e); } }
export async function POST(_: Request, { params }: { params: Promise<{ leagueId: string }> }) { try { return privateResult(await createInvite(await requireLeagueActor({ onboarding: true }), (await params).leagueId), 201); } catch (e) { return leagueError(e); } }
