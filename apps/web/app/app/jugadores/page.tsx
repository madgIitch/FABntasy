import Link from "next/link";
import { listPlayers, pageNumber } from "../../../src/server/sports";

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const result = await listPlayers(pageNumber(params.page ?? null), q);
  return <main className="app-main sports-page"><header className="workspace-header"><div><p className="eyebrow">Base deportiva</p><h1>Jugadores</h1></div><span className="live-status"><i /> {result.total} registros</span></header>
    <form className="search-strip"><label htmlFor="player-search">Buscar jugador</label><input id="player-search" name="q" defaultValue={q} placeholder="Nombre o apellidos" /><button>Buscar</button></form>
    <section className="data-section"><div className="data-table players-table"><div className="data-row data-head"><span>Jugador</span><span>Equipo</span><span>PJ</span><span>PTS</span><span>VAL</span></div>{result.items.map((player) => <Link className="data-row" href={`/app/jugadores/${player.id}`} key={player.id}><strong>{player.name}</strong><span>{player.team}</span><span>{player.games}</span><span>{player.points}</span><span>{player.valuation}</span></Link>)}</div>{!result.items.length && <p className="inline-empty">{q ? "No hay jugadores que coincidan con la búsqueda." : "Todavía no hay jugadores sincronizados."}</p>}
      {result.pages > 1 && <nav className="pagination" aria-label="Paginación">{result.page > 1 && <Link href={`?q=${encodeURIComponent(q)}&page=${result.page - 1}`}>← Anterior</Link>}<span>{result.page} / {result.pages}</span>{result.page < result.pages && <Link href={`?q=${encodeURIComponent(q)}&page=${result.page + 1}`}>Siguiente →</Link>}</nav>}
    </section>
  </main>;
}
