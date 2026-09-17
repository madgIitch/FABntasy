import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerUser } from "../../src/lib/supabase/server";
import { db } from "../../src/server/db";
import { avatarUrl, profileInitial } from "../../src/lib/avatar";
import { AccountAvatar, LogoutControl } from "./account-controls";
import { LeagueOnboarding } from "../../src/components/league-onboarding";
import { Navigation } from "../../src/components/ui/navigation";
import { restoreUsernameFromAuthMetadata } from "../../src/server/user-profile";
import { getRolloutAccess } from "../../src/server/rollout";

const nav = [
  ["/app", "Inicio", "home"],
  ["/app/mercado", "Mercado", "market"],
  ["/app/mi-equipo", "Mi equipo", "team"],
  ["/app/jornada", "Jornada", "calendar"],
  ["/app/ligas", "Liga", "league"],
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const rollout = await getRolloutAccess(user.id);
  let profile = await db.userProfile.findUnique({
    where: { authUserId: user.id },
    select: {
      id: true, username: true, displayName: true, avatarPath: true,
      adminGrants: { where: { role: "INGESTION_ADMIN", revokedAt: null }, take: 1, select: { id: true } },
      leagueMemberships: { where: { status: "ACTIVE", league: { status: "ACTIVE", legacyTeamId: null } }, orderBy: [{ joinedAt: "desc" }, { id: "asc" }], select: {
        id: true, role: true, league: { select: { id: true, name: true, leagueCode: true, ownerProfileId: true, _count: { select: { memberships: { where: { status: "ACTIVE" } } } } } },
      } },
    },
  });
  if (profile && !profile.username) {
    const restored = await restoreUsernameFromAuthMetadata(user.id, user.user_metadata?.username);
    if (restored) profile = { ...profile, username: restored.username };
  }
  if (rollout.state === "PREVIEW" && !rollout.isBypassed && !rollout.isAdmin) {
    const seasons = await db.competitionSeason.findMany({ where: { fantasyEnabled: true }, include: { competition: true }, orderBy: { createdAt: "desc" } });
    const previewLeagues = profile?.leagueMemberships.map(({ league }) => ({ id: league.id, name: league.name, leagueCode: league.leagueCode, memberCount: league._count.memberships, isOwner: league.ownerProfileId === profile.id })) ?? [];
    return <div className="league-gate rollout-preview"><LeagueOnboarding preview previewLeagues={previewLeagues} seasons={seasons.map((season) => ({ id: season.id, label: `${season.competition.name}${season.name ? ` · ${season.name}` : ""}` }))} /></div>;
  }
  if (!profile?.leagueMemberships.length && !profile?.adminGrants.length) {
    const seasons = await db.competitionSeason.findMany({ where: { fantasyEnabled: true }, include: { competition: true }, orderBy: { createdAt: "desc" } });
    return <div className="league-gate"><LeagueOnboarding seasons={seasons.map((season) => ({ id: season.id, label: `${season.competition.name}${season.name ? ` · ${season.name}` : ""}` }))} /></div>;
  }
  return <div className="app-frame">
    <aside className="side-nav">
      <Link className="wordmark" href="/app">Canastio</Link>
      <Navigation items={nav} />
      {profile.adminGrants.length ? <div className="admin-nav"><Link className="admin-nav-link" href="/app/admin/rollout">Control de acceso</Link><Link className="admin-nav-link" href="/app/admin/status">Estado del sistema</Link><Link className="admin-nav-link" href="/app/admin/ingestion">Administrar ingesta</Link><Link className="admin-nav-link" href="/app/admin/correcciones">Correcciones</Link></div> : null}
      <div className="side-account"><AccountAvatar imageUrl={avatarUrl(profile?.avatarPath)} initial={profileInitial(profile?.username, profile?.displayName)} /><span>{profile?.username ? `@${profile.username}` : "Completa tu perfil"}</span></div>
      <Link className="admin-nav-link" href="/app/perfil/feedback">Enviar feedback</Link>
      <LogoutControl />
    </aside>
    <div className="workspace"><div className="mobile-account"><Link className="wordmark" href="/app">Canastio</Link><AccountAvatar imageUrl={avatarUrl(profile?.avatarPath)} initial={profileInitial(profile?.username, profile?.displayName)} /></div>{children}</div>
    <div className="mobile-navigation-shell"><Navigation items={nav} mobile /></div>
  </div>;
}
