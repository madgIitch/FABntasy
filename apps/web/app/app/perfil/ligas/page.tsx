import { redirect } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/server";
import { getUserProfileOverview } from "../../../../src/server/user-profile";
import { resolveActiveLeagueId } from "../../../../src/server/private-leagues";
import { LeagueDirectory } from "../../../../src/components/league-directory";

export default async function MyLeaguesPage() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  const [profile, activeLeagueId] = await Promise.all([getUserProfileOverview(user.id), resolveActiveLeagueId({ authUserId: user.id })]);
  return <main className="app-main profile-page"><header className="workspace-header profile-header"><div><p className="eyebrow">Perfil</p><h1>Mis ligas</h1><p>Elige tu liga activa o añade un nuevo espacio de juego.</p></div></header><LeagueDirectory leagues={profile.leagues.map((league) => ({ ...league, isActive: league.id === activeLeagueId }))} /></main>;
}
