import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "../../src/lib/supabase/server";
import { db } from "../../src/server/db";
import { avatarUrl, profileInitial } from "../../src/lib/avatar";
import { AccountAvatar, LogoutControl } from "./account-controls";
import { LeagueOnboarding } from "../../src/components/league-onboarding";

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
  const profile = await db.userProfile.findUnique({ where: { authUserId: user.id }, select: { username: true, displayName: true, avatarPath: true, leagueMemberships: { where: { status: "ACTIVE", league: { status: "ACTIVE", legacyTeamId: null } }, take: 1, select: { id: true } } } });
  if (!profile?.leagueMemberships.length) {
    const seasons = await db.competitionSeason.findMany({ where: { fantasyEnabled: true }, include: { competition: true }, orderBy: { createdAt: "desc" } });
    return <div className="league-gate"><LeagueOnboarding seasons={seasons.map((season) => ({ id: season.id, label: `${season.competition.name}${season.name ? ` · ${season.name}` : ""}` }))} /></div>;
  }
  return <div className="app-frame">
    <aside className="side-nav">
      <Link className="wordmark" href="/app">Canastio</Link>
      <nav aria-label="Secciones de la aplicación">{nav.map(([href, label, icon]) => <Link href={href} key={href}><i aria-hidden="true">{icon}</i>{label}</Link>)}</nav>
      <div className="side-account"><AccountAvatar imageUrl={avatarUrl(profile?.avatarPath)} initial={profileInitial(profile?.username, profile?.displayName)} /><span>{profile?.username ? `@${profile.username}` : "Completa tu perfil"}</span></div>
      <LogoutControl />
    </aside>
    <div className="workspace"><div className="mobile-account"><AccountAvatar imageUrl={avatarUrl(profile?.avatarPath)} initial={profileInitial(profile?.username, profile?.displayName)} /></div>{children}</div>
    <nav className="bottom-nav" aria-label="Navegación móvil">{nav.map(([href, label, icon]) => <Link href={href} key={href}><i aria-hidden="true">{icon}</i><span>{label}</span></Link>)}</nav>
  </div>;
}
