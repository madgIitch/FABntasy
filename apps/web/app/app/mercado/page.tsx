import { CanastioMarket } from "../../../src/components/canastio-market";
import { db } from "../../../src/server/db";
import { getPlayerPrices } from "../../../src/server/player-pricing";

export default async function MarketPage() {
  const season = await db.competitionSeason.findFirst({ where: { fantasyEnabled: true }, orderBy: { updatedAt: "desc" }, select: { id: true } });
  if (!season) return <main className="app-main"><section className="empty-state"><span aria-hidden="true">↗</span><h1>La Bolsa Canastio</h1><p>No hay una competición fantasy activa.</p></section></main>;
  const players = await getPlayerPrices({ competitionSeasonId: season.id });
  if (!players.length) return <main className="app-main"><section className="empty-state"><span aria-hidden="true">↗</span><h1>La Bolsa Canastio</h1><p>Los precios aparecerán cuando termine la primera calibración.</p><small>Todos los jugadores parten provisionalmente de 5 M.</small></section></main>;
  return <CanastioMarket players={players} updatedAt={players[0]?.updatedAt} />;
}
