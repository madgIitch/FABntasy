import Link from "next/link";
import { getServerUser } from "../../../src/lib/supabase/server";
import { invitePreview, LeagueServiceError } from "../../../src/server/private-leagues";
import { InviteJoin } from "../../../src/components/invite-join";
import { restoreUsernameFromAuthMetadata } from "../../../src/server/user-profile";
import { db } from "../../../src/server/db";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let preview: Awaited<ReturnType<typeof invitePreview>> | null = null;
  let error = "";
  try { preview = await invitePreview(token); }
  catch (cause) { error = cause instanceof LeagueServiceError && cause.code === "COMPETITION_DISABLED" ? "La liga no admite nuevas incorporaciones ahora." : "Este enlace ya no es válido. Pide uno nuevo al propietario."; }
  const user = preview ? await getServerUser() : null;
  if (user) {
    const profile = await db.userProfile.findUnique({ where: { authUserId: user.id }, select: { username: true } });
    if (profile && !profile.username) await restoreUsernameFromAuthMetadata(user.id, user.user_metadata?.username);
  }
  const next = encodeURIComponent(`/liga/${token}`);
  return <main className="auth-page"><Link className="wordmark" href="/">Canastio</Link><section className="auth-panel">
    <p className="eyebrow">Invitación a una liga</p>
    {preview ? <><h1>{preview.name}</h1><p>{preview.competition} · {preview.members} de {preview.limit} managers</p>
      {preview.full ? <p role="status">La liga está llena. Si ya perteneces a ella, puedes abrirla; de otro modo necesitarás esperar una plaza.</p> : null}
      {user ? <InviteJoin token={token} />
          : <><p>Inicia sesión o crea una cuenta para unirte.</p><div className="auth-links"><Link href={`/login?next=${next}`}>Iniciar sesión</Link><Link href={`/registro?next=${next}`}>Crear cuenta</Link></div></>}
    </> : <><h1>Invitación no disponible</h1><p role="alert">{error}</p></>}
  </section></main>;
}
