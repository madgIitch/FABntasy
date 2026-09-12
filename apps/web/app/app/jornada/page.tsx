import { redirect } from "next/navigation";
import { getServerUser } from "../../../src/lib/supabase/server";
import { JourneyLive } from "../../../src/components/journey-live";
import { getJourney } from "../../../src/server/journey";

export default async function JourneyPage({searchParams}:{searchParams:Promise<{round?:string}>}){
 const user=await getServerUser();if(!user)redirect("/login");
 const query=await searchParams;const parsed=query.round?Number(query.round):undefined;const data=await getJourney(user.id,Number.isInteger(parsed)?parsed:undefined);
 return <JourneyLive data={data}/>;
}
