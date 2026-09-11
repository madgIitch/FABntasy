import { notFound } from "next/navigation";
import { getGame } from "../../../../src/server/sports";

const date = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" });
const formatDate = (value: Date | string) => date.format(new Date(value));

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const game = await getGame((await params).id);
  if (!game) notFound();
  return <main className="app-main sports-page"><header className="workspace-header"><div><p className="eyebrow">Jornada {game.roundNumber ?? "–"} · {game.competitionSeason.season.name}</p><h1>Partido</h1></div><span className="live-status"><i /> {game.statsSyncedAt ? `Stats ${formatDate(game.statsSyncedAt)}` : `Datos ${formatDate(game.lastSeenAt)}`}</span></header>
    <section className="scoreboard"><time>{game.scheduledAt ? formatDate(game.scheduledAt) : "Fecha por confirmar"}</time><div><span>{game.homeTeam.name}</span><strong>{game.homeScore ?? "–"}<i>:</i>{game.awayScore ?? "–"}</strong><span>{game.awayTeam.name}</span></div><small>{game.sourceStatus ?? game.status}</small></section>
    <section className="data-section"><div className="section-heading"><div><p className="eyebrow">Rendimiento</p><h2>Boxscore</h2></div></div>
      {!game.hasStatistics || !game.playerStats.length ? <div className="no-boxscore"><strong>Sin estadísticas disponibles</strong><p>El marcador y el estado son reales. FAB todavía no ha publicado un boxscore para este partido.</p></div> : <div className="data-table boxscore"><div className="data-row data-head"><span>Jugador</span><span>Equipo</span><span>MIN</span><span>PTS</span><span>REB</span><span>AST</span><span>VAL</span></div>{game.playerStats.map((stat) => <div className="data-row" key={stat.id}><strong>{stat.playerRegistration.player.displayName}</strong><span>{stat.playerRegistration.teamRegistration.team.name}</span><span>{stat.minutesPlayed?.toString() ?? "–"}</span><span>{stat.points ?? "–"}</span><span>{stat.rebounds ?? "–"}</span><span>{stat.assists ?? "–"}</span><span>{stat.valuation ?? "–"}</span></div>)}</div>}
    </section></main>;
}
