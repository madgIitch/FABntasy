import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "../auth/actions";
import { createClient } from "../../src/lib/supabase/server";

const nav = [
  ["/app", "Inicio", "⌂"],
  ["/app/mercado", "Mercado", "⇅"],
  ["/app/mi-equipo", "Mi equipo", "◉"],
  ["/app/jornada", "Jornada", "●"],
  ["/app/ligas", "Liga", "◆"],
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  return <div className="app-frame">
    <aside className="side-nav">
      <Link className="wordmark" href="/app">Canastio</Link>
      <nav aria-label="Secciones de la aplicación">{nav.map(([href, label, icon]) => <Link href={href} key={href}><i aria-hidden="true">{icon}</i>{label}</Link>)}</nav>
      <form action={logout}><button className="logout-button">Cerrar sesión</button></form>
    </aside>
    <div className="workspace">{children}</div>
    <nav className="bottom-nav" aria-label="Navegación móvil">{nav.map(([href, label, icon]) => <Link href={href} key={href}><i aria-hidden="true">{icon}</i><span>{label}</span></Link>)}</nav>
  </div>;
}
