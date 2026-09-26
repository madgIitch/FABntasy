import { leagueError } from "../../../../../../server/private-league-http";
import { LeagueServiceError } from "../../../../../../server/private-leagues";
export async function PUT(){return leagueError(new LeagueServiceError("INVITE_INVALID",410))}
