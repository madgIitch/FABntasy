import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";
import { avatarUrl, profileInitial } from "../../../src/lib/avatar";
import { getUserProfileOverview } from "../../../src/server/user-profile";
import { Icon } from "../../../src/components/ui/icon";
import { LogoutControl } from "../account-controls";
import { PwaSettings } from "./pwa-settings";
import { headers } from "next/headers";
import { SecuritySettings } from "./security-settings";
import { AppearanceSettings } from "./appearance-settings";
import { APP_LOCALE } from "../../../src/lib/preferences";

const points = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 1 });

const accountMessages: Record<string, string> = { "reauth-failed": "No se pudo confirmar tu identidad.", "email-pending": "Revisa ambos correos para completar el cambio.", "password-changed": "Contraseña actualizada.", "privacy-saved": "Preferencia de privacidad guardada.", "sessions-revoked": "Las demás sesiones han sido revocadas.", "delete-failed": "El borrado no pudo completarse; vuelve a intentarlo." };
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  const profile = await getUserProfileOverview(user.id);
  const image = avatarUrl(profile.avatarPath);
  const pointsLabel = profile.totalPoints === null ? "—" : points.format(profile.totalPoints);
  const ua = (await headers()).get("user-agent") ?? "";
  const device = /mobile|android|iphone/i.test(ua) ? "Móvil" : /tablet|ipad/i.test(ua) ? "Tablet" : "Navegador";
  const account = (await searchParams).account;

  return <main className="app-main profile-page">
    <header className="workspace-header profile-header"><div><p className="eyebrow">Mi cuenta</p><h1>Perfil</h1></div></header>

    <section className="profile-identity" aria-labelledby="profile-name">
      <div className="profile-court" aria-hidden="true" />
      <div className={`profile-avatar${image ? " has-image" : ""}`} style={image ? { backgroundImage: `url(${JSON.stringify(image).slice(1, -1)})` } : undefined}><span aria-hidden="true">{profileInitial(profile.username, profile.displayName)}</span></div>
      <div className="profile-person"><h2 id="profile-name">{profile.username ? `@${profile.username}` : "Completa tu perfil"}</h2><p>{profile.displayName || `Manager de Canastio`}</p></div>
      <div className="profile-stats" aria-label="Resumen fantasy"><div><strong>{profile.leagueCount}</strong><span>{profile.leagueCount === 1 ? "liga" : "ligas"}</span></div><div><strong>{pointsLabel}</strong><span>puntos</span></div></div>
      <Link className="profile-edit" href="/app/perfil/editar">Editar perfil <Icon name="chevron" /></Link>
    </section>

    <section className="profile-group" aria-labelledby="leagues-title">
      <div className="profile-group-heading"><h2 id="leagues-title">Mis ligas</h2><Link href="/app/ligas">+ Añadir</Link></div>
      <div className="profile-list">
        {profile.leagues.length ? profile.leagues.map((league) => <Link className="profile-league-row" key={league.id} href={`/app/ligas/${league.id}`}><span className="league-fallback" aria-hidden="true">{league.name.charAt(0).toUpperCase()}</span><span><strong>{league.name}</strong><small>{league.competitionName || "Competición"}</small><small>{league.teamName ?? "Sin equipo todavía"} · {league.memberCount} {league.memberCount === 1 ? "manager" : "managers"}</small></span><Icon name="chevron" /></Link>) : <div className="profile-empty"><p>Todavía no perteneces a ninguna liga.</p><Link href="/app/ligas">Añadir una liga</Link></div>}
      </div>
    </section>

    <section className="profile-group" aria-labelledby="account-title">
      <div className="profile-group-heading"><h2 id="account-title">Cuenta</h2></div>
      <div className="profile-list settings-list">
        <div className="setting-row"><Icon name="mail" /><span><strong>Correo electrónico</strong><small>{user.email}</small></span><span className="verified">{user.email_confirmed_at ? "Verificado" : "Sin verificar"}</span></div>
        <Link className="setting-row" href="/recuperar-clave"><Icon name="lock" /><span><strong>Contraseña</strong><small>••••••••</small></span><Icon name="chevron" /></Link>
      </div>
    </section>

    <AppearanceSettings />
    <PwaSettings vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />

    <SecuritySettings email={user.email ?? ""} username={profile.username} discoverable={profile.discoverableByUsername} lastSignInAt={user.last_sign_in_at ?? null} device={device} message={account ? accountMessages[account] ?? "No se pudo completar la operación." : undefined} />

    <div className="profile-logout setting-row"><Icon name="logout" /><LogoutControl /></div>
  </main>;
}
