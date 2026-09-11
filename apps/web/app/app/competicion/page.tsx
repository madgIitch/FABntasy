import Link from "next/link";
import { getCompetitionOverview, listGames } from "../../../src/server/sports";

const date = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function CompetitionPage() {
  const [competition, games] = await Promise.all([getCompetitionOverview(), listGames(1)]);
  if (!competition) return <main className="app-main"><header className="workspace-header"><div><p className="eyebrow">Datos deportivos</p><h1>Competición</h1></div></header><section className="empty-state"><span aria-hidden="true">00</span><h2>Sin competición activa</h2><p>La competición aparecerá cuando el ingestor marque una temporada como habilitada.</p><small>No mostramos datos simulados.</small></section></main>;
  return <main className="app-main sports-page">
    <header className="workspace-header"><div><p className="eyebrow">{competition.season} · {competition.delegation}</p><h1>{competition.name}</h1></div><span className="live-status"><i /> Actualizado {date.format(new Date(competition.updatedAt))}</span></header>
    <nav className="sports-tabs" aria-label="Explorador"><a href="#clasificacion">Clasificación</a><a href="#calendario">Calendario</a><Link href="/app/jugadores">Jugadores</Link></nav>
    <section id="clasificacion" className="data-section"><div className="section-heading"><div><p className="eyebrow">Tabla</p><h2>Clasificación</h2></div><span>{competition.standings.length} equipos</span></div>
      <div className="data-table standings"><div className="data-row data-head"><span>#</span><span>Equipo</span><span>PJ</span><span>G</span><span>P</span><span>+/-</span></div>{competition.standings.map((team, index) => <Link className="data-row" href={`/app/equipos/${team.id}`} key={team.id}><b>{String(index + 1).padStart(2, "0")}</b><strong>{team.name}</strong><span>{team.played}</span><span>{team.wins}</span><span>{team.losses}</span><span>{team.pointsFor - team.pointsAgainst}</span></Link>)}</div>
    </section>
    <section id="calendario" className="data-section"><div className="section-heading"><div><p className="eyebrow">Últimos partidos</p><h2>Calendario</h2></div><span>{games.total} partidos</span></div>
      <div className="fixture-list">{games.items.length ? games.items.map((game) => <Link className="fixture" href={`/app/partidos/${game.id}`} key={game.id}><time>{game.scheduledAt ? date.format(new Date(game.scheduledAt)) : "Por confirmar"}</time><div><span>{game.homeTeam.name}</span><strong>{game.homeScore ?? "–"}</strong></div><div><span>{game.awayTeam.name}</span><strong>{game.awayScore ?? "–"}</strong></div><small>{game.status === "live" ? "● En directo" : game.hasStatistics ? "Boxscore disponible" : game.sourceStatus ?? game.status}</small></Link>) : <p className="inline-empty">Todavía no hay partidos sincronizados.</p>}</div>
    </section>
  </main>;
}
