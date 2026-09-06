import { NextRequest } from "next/server";
import { rankingError, rankingOk, requireRankingActor } from "../../../../server/round-ranking-http";
import { getRanking } from "../../../../server/round-rankings";

export async function GET(request: NextRequest) { try {
  const round = request.nextUrl.searchParams.get("roundNumber");
  return rankingOk(await getRanking(await requireRankingActor(), { competitionSeasonId: request.nextUrl.searchParams.get("competitionSeasonId") ?? "",
    leagueId: request.nextUrl.searchParams.get("leagueId") ?? undefined, roundNumber: round === null ? undefined : Number(round) }));
} catch (error) { return rankingError(error); } }
