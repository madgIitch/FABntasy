import { LeagueHub } from "../../../src/components/league-hub";
import { requireLeagueActor } from "../../../src/server/private-league-http";
import { listLeagues } from "../../../src/server/private-leagues";
import { db } from "../../../src/server/db";

export default async function LeaguesPage({searchParams}:{searchParams:Promise<{league?:string}>}){
  const actor=await requireLeagueActor();
  const [leagues,seasons,query]=await Promise.all([listLeagues(actor),db.competitionSeason.findMany({where:{fantasyEnabled:true},include:{competition:true}}),searchParams]);
  const enriched=await Promise.all(leagues.map(async league=>{
    const [nextGame,lastGame,rules,transactions]=await Promise.all([
      db.game.findFirst({where:{competitionSeasonId:league.competitionSeasonId,scheduledAt:{gte:new Date()},roundNumber:{not:null}},orderBy:{scheduledAt:"asc"},select:{roundNumber:true}}),
      db.game.findFirst({where:{competitionSeasonId:league.competitionSeasonId,roundNumber:{not:null}},orderBy:{scheduledAt:"desc"},select:{roundNumber:true}}),
      db.fantasyRosterRuleSet.findFirst({where:{competitionSeasonId:league.competitionSeasonId,status:"ACTIVE"},orderBy:{createdAt:"desc"}}),
      db.marketTransaction.findMany({where:{leagueId:league.id},orderBy:[{createdAt:"desc"},{id:"desc"}],take:40,include:{playerRegistration:{include:{player:true}},buyerTeam:{include:{userProfile:true}},sellerTeam:{include:{userProfile:true}}}}),
    ]);
    return {...league,currentRound:nextGame?.roundNumber??lastGame?.roundNumber??null,rules:rules?{budgetCredits:Number(rules.budgetCredits),rosterSize:rules.rosterSize,starterCount:rules.starterCount,substituteCount:rules.substituteCount,maxPerRealTeam:rules.maxPerRealTeam}:null,activity:transactions.map(transaction=>({id:transaction.id,type:transaction.transactionType,player:transaction.playerRegistration.player.displayName,manager:transaction.buyerTeam?.userProfile.username??transaction.sellerTeam?.userProfile.username??transaction.buyerTeam?.userProfile.displayName??transaction.sellerTeam?.userProfile.displayName??"Usuario sin nombre",price:Number(transaction.priceCredits),createdAt:transaction.createdAt.toISOString()}))};
  }));
  return <LeagueHub initialLeagues={enriched} seasons={seasons.map(s=>({id:s.id,label:`${s.competition.name}${s.name?` · ${s.name}`:""}`}))} authUserId={actor.authUserId} initialLeagueId={query.league}/>;
}
