import Link from "next/link";
import { createClient } from "../src/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <main className="landing">
    <nav className="public-nav" aria-label="Navegación principal">
      <Link className="wordmark" href="/">FAB<span>ntasy</span></Link>
      <Link className="nav-access" href={user ? "/app" : "/login"}>{user ? "Entrar al equipo" : "Acceder"}</Link>
    </nav>
    <section className="court-hero">
      <div className="court-lines" aria-hidden="true"><span /><span /></div>
      <div className="hero-copy">
        <p className="eyebrow">Baloncesto federado andaluz</p>
        <h1>Tu liga.<br />Tu quinteto.</h1>
        <p className="hero-detail">Compite jornada a jornada con los jugadores que ves cada fin de semana.</p>
        <Link className="primary-action" href={user ? "/app" : "/registro"}>{user ? "Ver mi jornada" : "Crear mi equipo"}<span aria-hidden="true">↗</span></Link>
      </div>
      <p className="season-mark">SEVILLA · 26/27</p>
    </section>
  </main>;
}
