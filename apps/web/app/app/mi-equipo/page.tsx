import { redirect } from "next/navigation";
import Link from "next/link";
import { FantasyTeamManager } from "../../../src/components/fantasy-team-manager";
import { getServerUser } from "../../../src/lib/supabase/server";
import { db } from "../../../src/server/db";
import { FantasyTeamServiceError, getFantasyTeam } from "../../../src/server/fantasy-team";
import { marketV2State } from "../../../src/server/market-v2";
import { listLeagues, resolveActiveLeagueId } from "../../../src/server/private-leagues";

export default async function MyTeamPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const activeLeagueId = await resolveActiveLeagueId({ authUserId: user.id });
  const leagues = await listLeagues({ authUserId: user.id });
  const league = leagues.find(item => item.id === activeLeagueId);
  const seasonId = league?.competitionSeasonId;
  const eligibleSeasonIds = league?.selectedSeasons.filter(item => item.competitionSeason.fantasyEnabled).map(item => item.competitionSeasonId) ?? [];

  if (!seasonId) return <main className="app-main"><section className="empty-state"><span aria-hidden="true">◎</span><h1>Mi equipo</h1><p>No hay una competición fantasy activa.</p></section></main>;

  const nextGame = await db.game.findFirst({
    where: { competitionSeasonId: seasonId, syncStatus: "active", roundNumber: { not: null }, scheduledAt: { gt: new Date() } },
    orderBy: [{ scheduledAt: "asc" }], select: { roundNumber: true, scheduledAt: true },
  });
  const roundNumber = nextGame?.roundNumber ?? 1;
  let initialTeam = null;
  try {
    initialTeam = await getFantasyTeam({ authUserId: user.id }, seasonId, roundNumber, league!.id);
  } catch (error) {
    if (!(error instanceof FantasyTeamServiceError) || error.code !== "TEAM_NOT_FOUND") throw error;
  }

  if (!initialTeam && (await marketV2State()).active) return <main className="app-main"><section className="empty-state"><h1>Empieza en el mercado</h1><p>Los jugadores libres se consiguen mediante las pujas diarias de tu liga.</p><Link className="primary-action" href="/app/mercado">Ver pujas de hoy →</Link></section></main>;

  const playerMetrics: Record<string, { roundPoints: number | null; recentPoints: number[] }> = {};
  if (initialTeam) {
    const scores = await db.fantasyPlayerGameScore.findMany({
      where: {
        playerId: { in: initialTeam.roster.map((player) => player.playerId) },
        game: { competitionSeasonId: { in: eligibleSeasonIds.length ? eligibleSeasonIds : [seasonId] } },
        normalizedFantasyPoints: { not: null },
      },
      orderBy: { game: { scheduledAt: "desc" } },
      select: { playerId: true, normalizedFantasyPoints: true, game: { select: { roundNumber: true } } },
    });
    for (const player of initialTeam.roster) {
      const playerScores = scores.filter((score) => score.playerId === player.playerId);
      const roundScores = playerScores.filter((score) => score.game.roundNumber === roundNumber);
      playerMetrics[player.playerRegistrationId] = {
        roundPoints: roundScores.length ? roundScores.reduce((sum, score) => sum + Number(score.normalizedFantasyPoints), 0) : null,
        recentPoints: playerScores.slice(0, 5).map((score) => Number(score.normalizedFantasyPoints)),
      };
    }
  }

  const eligiblePlayers = initialTeam ? [] : await db.playerRegistration.findMany({
    where: { competitionSeasonId: { in: eligibleSeasonIds.length ? eligibleSeasonIds : [seasonId] }, identityStatus: { not: "CONFLICT" } }, take: 80,
    orderBy: { player: { displayName: "asc" } },
    select: { id: true, player: { select: { displayName: true } }, teamRegistration: { select: { team: { select: { name: true } } } }, prices: { orderBy: { updatedAt: "desc" }, take: 1, select: { currentPrice: true } } },
  });

  if (!initialTeam && eligiblePlayers.length === 0) return <main className="app-main"><section className="empty-state"><h1>Tu plantilla estará disponible pronto</h1><p>Estamos esperando las fichas de jugadores que publique la FAB para esta competición. La sincronización las comprobará periódicamente.</p></section></main>;

  return <FantasyTeamManager
    key={league!.id}
    leagueContext={{competition:league!.competitionSeason.competition.name,activeLeague:{id:league!.id,name:league!.name},leagues:leagues.map(item=>({id:item.id,name:item.name}))}}
    competitionSeasonId={seasonId}
    roundNumber={roundNumber}
    cutoffAt={nextGame?.scheduledAt?.toISOString() ?? null}
    initialTeam={initialTeam}
    playerMetrics={playerMetrics}
    eligiblePlayers={eligiblePlayers.map((item) => ({
      playerRegistrationId: item.id,
      displayName: item.player.displayName,
      realTeamName: item.teamRegistration.team.name,
      acquisitionPrice: item.prices[0] ? Number(item.prices[0].currentPrice) : 3_000_000,
      currentMarketPrice: item.prices[0] ? Number(item.prices[0].currentPrice) : null,
    }))}
  />;
}
