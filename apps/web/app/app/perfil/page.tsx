import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";
import { avatarUrl, profileInitial } from "../../../src/lib/avatar";
import { getUserProfileOverview } from "../../../src/server/user-profile";
import { LogoutControl } from "../account-controls";

const points = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

export default async function ProfilePage() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  const profile = await getUserProfileOverview(user.id);
  const image = avatarUrl(profile.avatarPath);
  return <main className="app-main profile-page">
    <header className="workspace-header"><div><p className="eyebrow">Mi cuenta</p><h1>Perfil</h1></div><Link className="text-action" href="/app/perfil/editar">Editar perfil <span aria-hidden="true">→</span></Link></header>

    <section className="profile-identity" aria-labelledby="profile-name">
      <div className={`profile-avatar${image ? " has-image" : ""}`} style={image ? { backgroundImage: `url(${JSON.stringify(image).slice(1, -1)})` } : undefined}><span aria-hidden="true">{profileInitial(profile.username, profile.displayName)}</span></div>
      <div><p className="eyebrow">Usuario Canastio</p><h2 id="profile-name">{profile.displayName || (profile.username ? `@${profile.username}` : "Completa tu perfil")}</h2>{profile.username && profile.displayName && <p>@{profile.username}</p>}{!profile.username && <Link className="inline-alert" href="/app/perfil/editar">Elige tu nombre de usuario para continuar</Link>}</div>
    </section>

    <section className="profile-stats" aria-label="Resumen fantasy"><div><strong>{profile.leagueCount}</strong><span>{profile.leagueCount === 1 ? "liga activa" : "ligas activas"}</span></div><div><strong>{profile.totalPoints === null ? "Pendiente" : points.format(profile.totalPoints)}</strong><span>puntos publicados</span></div></section>

    <section className="profile-section" aria-labelledby="leagues-title"><div className="section-heading"><div><p className="eyebrow">Canastio</p><h2 id="leagues-title">Mis ligas</h2></div><div><Link href="/app/ligas">Unirme</Link><Link href="/app/ligas">Crear liga</Link></div></div>
      {profile.leagues.length ? <div className="profile-league-list">{profile.leagues.map((league) => <Link key={league.id} href={`/app/ligas/${league.id}`}><div><strong>{league.name}</strong><span>{league.teamName ?? (league.hasTeam ? "Mi equipo" : "Equipo pendiente")} · {league.memberCount} {league.memberCount === 1 ? "manager" : "managers"}</span></div><span aria-hidden="true">→</span></Link>)}</div> : <div className="profile-empty"><p>Todavía no perteneces a ninguna liga.</p><Link href="/app/ligas">Encontrar una liga</Link></div>}
    </section>

    <section className="profile-section account-section" aria-labelledby="account-title"><div><p className="eyebrow">Seguridad</p><h2 id="account-title">Cuenta</h2></div><dl><div><dt>Correo electrónico</dt><dd>{user.email}</dd></div><div><dt>Estado</dt><dd>{user.email_confirmed_at ? "Verificado" : "Pendiente de verificar"}</dd></div></dl><Link className="setting-row" href="/recuperar-clave"><span>Cambiar contraseña</span><span aria-hidden="true">→</span></Link></section>

    <section className="profile-future" aria-label="Próximas funciones"><p>Notificaciones, privacidad y sesiones activas llegarán en próximas versiones.</p></section>
    <div className="profile-logout"><LogoutControl /></div>
  </main>;
}
