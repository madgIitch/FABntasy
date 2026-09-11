import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "../../src/lib/supabase/server";
import { db } from "../../src/server/db";
import { avatarUrl, profileInitial } from "../../src/lib/avatar";
import { AccountAvatar, LogoutControl } from "./account-controls";
import { LeagueOnboarding } from "../../src/components/league-onboarding";
import { Navigation } from "../../src/components/ui/navigation";
import { restoreUsernameFromAuthMetadata } from "../../src/server/user-profile";

const nav = [
  ["/app", "Inicio", "home"],
  ["/app/mercado", "Mercado", "market"],
  ["/app/mi-equipo", "Mi equipo", "team"],
  ["/app/jornada", "Jornada", "calendar"],
  ["/app/ligas", "Liga", "league"],
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  let profile = await db.userProfile.findUnique({ where: { authUserId: user.id }, select: { username: true, displayName: true, avatarPath: true, adminGrants: { where: { role: "INGESTION_ADMIN", revokedAt: null }, take: 1, select: { id: true } }, leagueMemberships: { where: { status: "ACTIVE", league: { status: "ACTIVE", legacyTeamId: null } }, take: 1, select: { id: true } } } });
  if (profile && !profile.username) {
    const restored = await restoreUsernameFromAuthMetadata(user.id, user.user_metadata?.username);
    if (restored) profile = { ...profile, username: restored.username };
  }
  if (!profile?.leagueMemberships.length && !profile?.adminGrants.length) {
    const seasons = await db.competitionSeason.findMany({ where: { fantasyEnabled: true }, include: { competition: true }, orderBy: { createdAt: "desc" } });
    return <div className="league-gate"><LeagueOnboarding seasons={seasons.map((season) => ({ id: season.id, label: `${season.competition.name}${season.name ? ` · ${season.name}` : ""}` }))} /></div>;
  }
  return <div className="app-frame">
    <aside className="side-nav">
      <Link className="wordmark" href="/app">Canastio</Link>
      <Navigation items={nav} />
      {profile.adminGrants.length ? <Link className="admin-nav-link" href="/app/admin/ingestion">Administrar ingesta</Link> : null}
      <div className="side-account"><AccountAvatar imageUrl={avatarUrl(profile?.avatarPath)} initial={profileInitial(profile?.username, profile?.displayName)} /><span>{profile?.username ? `@${profile.username}` : "Completa tu perfil"}</span></div>
      <LogoutControl />
    </aside>
    <div className="workspace"><div className="mobile-account"><Link className="wordmark" href="/app">Canastio</Link><AccountAvatar imageUrl={avatarUrl(profile?.avatarPath)} initial={profileInitial(profile?.username, profile?.displayName)} /></div>{children}</div>
    <Navigation items={nav} mobile />
  </div>;
}
