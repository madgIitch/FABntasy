import { redirect } from "next/navigation";
import { getServerUser } from "../../../src/lib/supabase/server";
import { JourneyLive } from "../../../src/components/journey-live";
import { getJourney } from "../../../src/server/journey";
import { listLeagues, resolveActiveLeagueId } from "../../../src/server/private-leagues";

export default async function JourneyPage({searchParams}:{searchParams:Promise<{round?:string}>}){
 const user=await getServerUser();if(!user)redirect("/login");
 const activeLeagueId=await resolveActiveLeagueId({authUserId:user.id});const leagues=await listLeagues({authUserId:user.id});const league=leagues.find(item=>item.id===activeLeagueId);
 const query=await searchParams;const parsed=query.round?Number(query.round):undefined;const data=activeLeagueId?await getJourney(user.id,Number.isInteger(parsed)?parsed:undefined,activeLeagueId):null;
 return <JourneyLive key={activeLeagueId} data={data} leagueContext={league?{competition:league.competitionSeason.competition.name,activeLeague:{id:league.id,name:league.name},leagues:leagues.map(item=>({id:item.id,name:item.name}))}:undefined}/>;
}
