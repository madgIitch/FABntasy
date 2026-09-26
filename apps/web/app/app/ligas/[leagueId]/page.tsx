import { redirect } from "next/navigation";
import Link from "next/link";
import { requireLeagueActor } from "../../../../src/server/private-league-http";
import { db } from "../../../../src/server/db";
export default async function LeaguePage({params}:{params:Promise<{leagueId:string}>}){
  const { leagueId } = await params;
  const actor = await requireLeagueActor();
  const profile = await db.userProfile.findUnique({ where: { authUserId: actor.authUserId }, select: { id: true } });
  const league = profile ? await db.fantasyLeague.findFirst({
    where: { id: leagueId, memberships: { some: { userProfileId: profile.id, status: "ACTIVE" } } },
    select: { name: true, competitionSeason: { select: { fantasyEnabled: true } }, selectedSeasons: { select: { competitionSeason: { select: { fantasyEnabled: true } } } } },
  }) : null;
  if (league && !league.competitionSeason.fantasyEnabled && !league.selectedSeasons.some(item => item.competitionSeason.fantasyEnabled)) return <main>
    <h1>{league.name}</h1>
    <p>Esta competición no está disponible en Fantasy. Tu liga, plantilla e historial se conservan para cuando vuelva a habilitarse.</p>
    <Link href="/app/ligas">Ver mis ligas disponibles</Link>
  </main>;
  redirect(`/app/ligas?league=${encodeURIComponent(leagueId)}`);
}
