import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeam } from "../../../../src/server/sports";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const team = await getTeam((await params).id);
  if (!team) notFound();
  const registration = team.registrations[0];
  return <main className="app-main sports-page"><header className="workspace-header"><div><p className="eyebrow">{team.clubName ?? registration?.competitionSeason.season.name ?? "Equipo"}</p><h1>{team.name}</h1></div><span className="live-status"><i /> {registration?.playerRegistrations.length ?? 0} jugadores</span></header>
    <section className="data-section"><div className="section-heading"><div><p className="eyebrow">Plantilla real</p><h2>Jugadores</h2></div></div><div className="data-table players-table"><div className="data-row data-head"><span>Jugador</span><span>Dorsal</span><span>PJ</span><span>PTS</span><span>VAL</span></div>{registration?.playerRegistrations.map((entry) => <Link className="data-row" href={`/app/jugadores/${entry.player.id}`} key={entry.id}><strong>{entry.player.displayName}</strong><span>{entry.shirtNumber ?? "–"}</span><span>{entry.stats.length}</span><span>{entry.stats.reduce((sum, stat) => sum + (stat.points ?? 0), 0)}</span><span>{entry.stats.reduce((sum, stat) => sum + (stat.valuation ?? 0), 0)}</span></Link>)}</div>{!registration?.playerRegistrations.length && <p className="inline-empty">Todavía no hay jugadores sincronizados para este equipo.</p>}</section>
  </main>;
}
