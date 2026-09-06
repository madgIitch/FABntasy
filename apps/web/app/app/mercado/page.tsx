import { PLAYER_PRICING_V1 } from "../../../../../packages/domain/player-pricing";
import { CanastioMarket } from "../../../src/components/canastio-market";
import { db } from "../../../src/server/db";
import { getPlayerPrices } from "../../../src/server/player-pricing";

export default async function MarketPage() {
  const season = await db.competitionSeason.findFirst({ where: { fantasyEnabled: true }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, competition: { select: { name: true } } } });
  if (!season) return <main className="app-main"><section className="empty-state"><span aria-hidden="true">↗</span><h1>La Bolsa Canastio</h1><p>No hay una competición fantasy activa.</p></section></main>;
  const [prices, registrations] = await Promise.all([
    getPlayerPrices({ competitionSeasonId: season.id }),
    db.playerRegistration.findMany({
      where: { competitionSeasonId: season.id }, orderBy: { player: { displayName: "asc" } },
      include: {
        player: true,
        teamRegistration: { include: { team: true } },
        stats: { include: { game: true, fantasyScores: { where: { ruleSet: { status: "ACTIVE" } }, orderBy: { createdAt: "desc" }, take: 1 } } },
      },
    }),
  ]);
  const priceByRegistration = new Map(prices.map((price) => [price.playerRegistrationId, price]));
  const competitionName = `${season.competition.name}${season.name ? ` · ${season.name}` : ""}`;
  const players = registrations.map((registration) => {
    const stored = priceByRegistration.get(registration.id);
    const scores = registration.stats.filter((stat) => stat.fantasyScores[0]?.status === "CALCULATED" && stat.fantasyScores[0].normalizedFantasyPoints !== null)
      .sort((a, b) => (b.game.roundNumber ?? 0) - (a.game.roundNumber ?? 0)).map((stat) => Number(stat.fantasyScores[0].normalizedFantasyPoints));
    const metrics = { competitionName, averageFantasyPoints: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null, recentFantasyPoints: scores.slice(0, 3) };
    return stored ? { ...stored, ...metrics } : { playerRegistrationId: registration.id, playerId: registration.playerId, displayName: registration.player.displayName,
      realTeamName: registration.teamRegistration.team.name, competitionSeasonId: season.id, algorithmVersion: PLAYER_PRICING_V1.version, status: "PROVISIONAL",
      currentPrice: PLAYER_PRICING_V1.initialPrice, previousPrice: null, changeCredits: 0, changePercent: null, trend: "FLAT" as const,
      allTimeHigh: PLAYER_PRICING_V1.initialPrice, allTimeLow: PLAYER_PRICING_V1.initialPrice, roundNumber: null, updatedAt: "", ...metrics };
  });
  return <CanastioMarket players={players} updatedAt={prices[0]?.updatedAt} />;
}
