import { redirect } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/server";
import { db } from "../../../../src/server/db";
import { ProfileForm } from "../profile-form";

export default async function EditProfilePage() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  const profile = await db.userProfile.findUnique({ where: { authUserId: user.id }, select: { username: true, displayName: true } });
  if (!profile) redirect("/login");
  return <main className="app-main profile-page">
    <header className="workspace-header"><div><p className="eyebrow">Cuenta Canastio</p><h1>Editar perfil</h1></div></header>
    <section className="profile-editor" aria-labelledby="identity-title"><h2 id="identity-title">Tu identidad</h2><p>El usuario es global. El nombre de cada equipo se gestiona dentro de su liga.</p><ProfileForm username={profile.username} displayName={profile.displayName} /></section>
  </main>;
}
