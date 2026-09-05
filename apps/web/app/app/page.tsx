import Link from "next/link";
export default function DashboardPage() {
  return <main className="app-main">
    <header className="workspace-header"><div><p className="eyebrow">Temporada 2026/27</p><h1>Inicio</h1></div><span className="live-status"><i /> Datos sincronizados</span></header>
    <section className="round-focus">
      <div><p>Próxima jornada</p><strong>Jornada 01</strong><span>El calendario aparecerá cuando la competición esté publicada.</span></div>
      <div className="round-number">01</div>
    </section>
    <section className="quick-list" aria-labelledby="prepare-title">
      <h2 id="prepare-title">Prepara tu jornada</h2>
      <Link href="/app/mi-equipo"><span>01</span><div><strong>Completa tu equipo</strong><small>Tu plantilla todavía está vacía</small></div><b>→</b></Link>
      <Link href="/app/mercado"><span>02</span><div><strong>Explora el mercado</strong><small>Los jugadores estarán disponibles en el próximo sprint</small></div><b>→</b></Link>
    </section>
  </main>;
}
