import { LeagueHub } from "../../../src/components/league-hub";
import { requireLeagueActor } from "../../../src/server/private-league-http";
import { listLeagues } from "../../../src/server/private-leagues";
import { db } from "../../../src/server/db";

export default async function LeaguesPage({searchParams}:{searchParams:Promise<{league?:string}>}){
  const actor=await requireLeagueActor();
  const [leagues,seasons,query]=await Promise.all([listLeagues(actor),db.competitionSeason.findMany({where:{fantasyEnabled:true},include:{competition:true}}),searchParams]);
  const enriched=await Promise.all(leagues.map(async league=>{
    const [nextGame,lastGame,rules]=await Promise.all([
      db.game.findFirst({where:{competitionSeasonId:league.competitionSeasonId,scheduledAt:{gte:new Date()},roundNumber:{not:null}},orderBy:{scheduledAt:"asc"},select:{roundNumber:true}}),
      db.game.findFirst({where:{competitionSeasonId:league.competitionSeasonId,roundNumber:{not:null}},orderBy:{scheduledAt:"desc"},select:{roundNumber:true}}),
      db.fantasyRosterRuleSet.findFirst({where:{competitionSeasonId:league.competitionSeasonId,status:"ACTIVE"},orderBy:{createdAt:"desc"}}),
    ]);
    return {...league,currentRound:nextGame?.roundNumber??lastGame?.roundNumber??null,rules:rules?{budgetCredits:Number(rules.budgetCredits),rosterSize:rules.rosterSize,starterCount:rules.starterCount,substituteCount:rules.substituteCount,maxPerRealTeam:rules.maxPerRealTeam}:null};
  }));
  return <LeagueHub initialLeagues={enriched} seasons={seasons.map(s=>({id:s.id,label:`${s.competition.name}${s.name?` · ${s.name}`:""}`}))} authUserId={actor.authUserId} initialLeagueId={query.league}/>;
}
