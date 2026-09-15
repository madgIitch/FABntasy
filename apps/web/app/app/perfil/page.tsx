import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";
import { avatarUrl, profileInitial } from "../../../src/lib/avatar";
import { getUserProfileOverview } from "../../../src/server/user-profile";
import { Icon } from "../../../src/components/ui/icon";
import { ProfileLogoutControl } from "./logout-control";
import { APP_LOCALE } from "../../../src/lib/preferences";

const points = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 1 });
const messages: Record<string, string> = { "reauth-failed": "No se pudo confirmar tu identidad.", "email-pending": "Revisa ambos correos para completar el cambio.", "password-changed": "Contraseña actualizada.", "privacy-saved": "Preferencia de privacidad guardada.", "sessions-revoked": "Las demás sesiones han sido revocadas.", "delete-failed": "El borrado no pudo completarse; vuelve a intentarlo." };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  const profile = await getUserProfileOverview(user.id), image = avatarUrl(profile.avatarPath), account = (await searchParams).account;
  return <main className="app-main profile-page">
    <header className="workspace-header profile-header"><div><p className="eyebrow">Mi cuenta</p><h1>Perfil</h1></div></header>
    <section className="profile-identity" aria-labelledby="profile-name"><div className="profile-court" aria-hidden="true" /><div className={`profile-avatar${image ? " has-image" : ""}`} style={image ? { backgroundImage: `url(${JSON.stringify(image).slice(1, -1)})` } : undefined}><span aria-hidden="true">{profileInitial(profile.username, profile.displayName)}</span></div><div className="profile-person"><h2 id="profile-name">{profile.username ? `@${profile.username}` : "Completa tu perfil"}</h2><p>{profile.displayName || "Manager de Canastio"}</p></div><div className="profile-stats" aria-label="Resumen fantasy"><div><strong>{profile.leagueCount}</strong><span>{profile.leagueCount === 1 ? "liga" : "ligas"}</span></div><div><strong>{profile.totalPoints === null ? "—" : points.format(profile.totalPoints)}</strong><span>puntos</span></div></div><Link className="profile-edit" href="/app/perfil/editar">Editar perfil <Icon name="chevron" /></Link></section>
    <section className="profile-group" aria-labelledby="leagues-title"><div className="profile-group-heading"><h2 id="leagues-title">Mis ligas</h2><Link href="/app/ligas">+ Añadir</Link></div><div className="profile-list">{profile.leagues.length ? profile.leagues.map(league => <Link className="profile-league-row" key={league.id} href={`/app/ligas/${league.id}`}><span className="league-fallback" aria-hidden="true">{league.name.charAt(0).toUpperCase()}</span><span><strong>{league.name}</strong><small>{league.competitionName || "Competición"}</small><small>{league.teamName ?? "Sin equipo todavía"} · {league.memberCount} {league.memberCount === 1 ? "manager" : "managers"}</small></span><Icon name="chevron" /></Link>) : <div className="profile-empty"><p>Todavía no perteneces a ninguna liga.</p><Link href="/app/ligas">Añadir una liga</Link></div>}</div></section>
    {account ? <p className="form-message" role="status">{messages[account] ?? "No se pudo completar la operación."}</p> : null}
    <HubGroup title="Cuenta"><HubLink href="/app/perfil/seguridad/correo" title="Correo electrónico" detail={`${user.email ?? "Sin correo"} · ${user.email_confirmed_at ? "Verificado" : "Sin verificar"}`} /><HubLink href="/app/perfil/seguridad/contrasena" title="Contraseña" detail="••••••••" /></HubGroup>
    <HubGroup title="Preferencias"><HubLink href="/app/perfil/preferencias" title="Apariencia e idioma" detail="Tema, idioma y zona horaria" /><HubLink href="/app/perfil/notificaciones" title="Notificaciones" detail="Permisos y tipos de aviso" /></HubGroup>
    <HubGroup title="Seguridad y privacidad"><HubLink href="/app/perfil/seguridad" title="Seguridad" detail="Correo, contraseña y sesiones" /><HubLink href="/app/perfil/privacidad" title="Privacidad y datos" detail="Visibilidad, exportación y eliminación" /></HubGroup>
    <HubGroup title="Ayuda"><HubLink href="/app/perfil/feedback" title="Enviar feedback" detail="Cuéntanos un problema o comparte una idea" /></HubGroup>
    <div className="profile-logout setting-row"><Icon name="logout" /><ProfileLogoutControl /></div>
  </main>;
}

function HubGroup({ title, children }: { title: string; children: ReactNode }) { const id = `${title.toLowerCase().replaceAll(" ", "-")}-title`; return <section className="profile-group" aria-labelledby={id}><div className="profile-group-heading"><h2 id={id}>{title}</h2></div><div className="profile-list settings-list">{children}</div></section>; }
function HubLink({ href, title, detail }: { href: string; title: string; detail: string }) { return <Link className="setting-row settings-link" href={href}><span><strong>{title}</strong><small>{detail}</small></span><Icon name="chevron" /></Link>; }
