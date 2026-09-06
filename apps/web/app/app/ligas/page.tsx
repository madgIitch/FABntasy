import { LeagueHub } from "../../../src/components/league-hub";
import { requireLeagueActor } from "../../../src/server/private-league-http";
import { listLeagues } from "../../../src/server/private-leagues";
import { db } from "../../../src/server/db";
export default async function LeaguesPage(){const [leagues,seasons]=await Promise.all([listLeagues(await requireLeagueActor()),db.competitionSeason.findMany({where:{fantasyEnabled:true},include:{competition:true}})]);return <LeagueHub initialLeagues={leagues} seasons={seasons.map(s=>({id:s.id,label:`${s.competition.name}${s.name?` · ${s.name}`:""}`}))}/>}
