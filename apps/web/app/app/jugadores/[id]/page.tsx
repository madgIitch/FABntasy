import { notFound } from "next/navigation";
import { getPlayer } from "../../../../src/server/sports";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await getPlayer((await params).id);
  if (!data) notFound();
  const registration = data.player.registrations[0];
  return <main className="app-main sports-page"><header className="workspace-header player-header"><div><p className="eyebrow">{registration?.teamRegistration.team.name ?? "Sin equipo"}</p><h1>{data.player.displayName}</h1></div><span className="live-status"><i /> {data.games} partidos</span></header>
    <section className="stat-line" aria-label="Acumulados de temporada">{Object.entries({ Puntos: data.totals.points, Rebotes: data.totals.rebounds, Asistencias: data.totals.assists, Robos: data.totals.steals, Valoración: data.totals.valuation }).map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>
    <section className="data-section"><div className="section-heading"><div><p className="eyebrow">Temporada</p><h2>Partidos</h2></div></div><div className="fixture-list">{registration?.stats.map((stat) => <div className="fixture compact" key={stat.id}><time>J{stat.game.roundNumber ?? "–"}</time><div><span>{stat.game.homeTeam.name} — {stat.game.awayTeam.name}</span><strong>{stat.points ?? "–"} pts</strong></div><small>{stat.valuation ?? "–"} val</small></div>)}</div></section>
  </main>;
}
