import { redirect } from "next/navigation";
import { FantasyTeamManager } from "../../../src/components/fantasy-team-manager";
import { createClient } from "../../../src/lib/supabase/server";
import { db } from "../../../src/server/db";
import { FantasyTeamServiceError, getFantasyTeam } from "../../../src/server/fantasy-team";

export default async function MyTeamPage() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");

  const profile = await db.userProfile.findUnique({ where: { authUserId: user.id }, select: { id: true } });
  const existing = profile ? await db.fantasyTeam.findFirst({
    where: { userProfileId: profile.id },
    orderBy: { updatedAt: "desc" },
    select: { competitionSeasonId: true },
  }) : null;
  const fallbackSeason = existing ? null : await db.competitionSeason.findFirst({
    where: { fantasyEnabled: true }, orderBy: { updatedAt: "desc" }, select: { id: true },
  });
  const seasonId = existing?.competitionSeasonId ?? fallbackSeason?.id;

  if (!seasonId) return <main className="app-main"><section className="empty-state"><span aria-hidden="true">◎</span><h1>Mi equipo</h1><p>No hay una competición fantasy activa.</p></section></main>;

  const nextGame = await db.game.findFirst({
    where: { competitionSeasonId: seasonId, syncStatus: "active", roundNumber: { not: null }, scheduledAt: { gt: new Date() } },
    orderBy: [{ scheduledAt: "asc" }], select: { roundNumber: true },
  });
  const roundNumber = nextGame?.roundNumber ?? 1;
  let initialTeam = null;
  try {
    initialTeam = await getFantasyTeam({ authUserId: user.id }, seasonId, roundNumber);
  } catch (error) {
    if (!(error instanceof FantasyTeamServiceError) || error.code !== "TEAM_NOT_FOUND") throw error;
  }

  const playerMetrics: Record<string, { roundPoints: number | null; recentPoints: number[] }> = {};
  if (initialTeam) {
    const scores = await db.fantasyPlayerGameScore.findMany({
      where: {
        playerId: { in: initialTeam.roster.map((player) => player.playerId) },
        game: { competitionSeasonId: seasonId },
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
    where: { competitionSeasonId: seasonId }, take: 80,
    orderBy: { player: { displayName: "asc" } },
    select: { id: true, player: { select: { displayName: true } }, teamRegistration: { select: { team: { select: { name: true } } } } },
  });

  return <FantasyTeamManager
    competitionSeasonId={seasonId}
    roundNumber={roundNumber}
    initialTeam={initialTeam}
    playerMetrics={playerMetrics}
    eligiblePlayers={eligiblePlayers.map((item) => ({
      playerRegistrationId: item.id,
      displayName: item.player.displayName,
      realTeamName: item.teamRegistration.team.name,
      acquisitionPrice: 3_000_000,
    }))}
  />;
}
