import { db } from "./db";
export type HomeDashboard = Awaited<ReturnType<typeof getHomeDashboard>>;
const liveStatuses = ["live", "playing", "in_progress"];
export async function getHomeDashboard(authUserId: string, requestedLeagueId?: string) {
 const profile=await db.userProfile.findUnique({where:{authUserId},include:{fantasyTeams:{where:{league:{status:"ACTIVE"}},orderBy:{updatedAt:"desc"},include:{league:true,competitionSeason:{include:{competition:true}},rosterSlots:{include:{playerRegistration:{include:{player:true,teamRegistration:true}}}},lineups:{where:{supersededAt:null},orderBy:{roundNumber:"desc"},take:2,include:{slots:true}},total:true}}}});
 if(!profile)return{kind:"NO_PROFILE" as const,updatedAt:new Date().toISOString()};
 const team=profile.fantasyTeams.find(x=>x.leagueId===requestedLeagueId)??profile.fantasyTeams[0];
 if(!team)return{kind:"NO_TEAM" as const,displayName:profile.displayName,updatedAt:new Date().toISOString()};
 const now=new Date(),realTeamIds=[...new Set(team.rosterSlots.map(x=>x.playerRegistration.teamRegistration.teamId))];
 const [games,events,transactions]=await Promise.all([
  db.game.findMany({where:{competitionSeasonId:team.competitionSeasonId,syncStatus:"active",scheduledAt:{gte:now},...(realTeamIds.length?{OR:[{homeTeamId:{in:realTeamIds}},{awayTeamId:{in:realTeamIds}}]}:{})},orderBy:{scheduledAt:"asc"},take:8,include:{homeTeam:true,awayTeam:true}}),
  db.playerPriceEvent.findMany({where:{competitionSeasonId:team.competitionSeasonId,status:"PUBLISHED",previousPrice:{gt:0}},orderBy:{createdAt:"desc"},take:30,include:{playerRegistration:{include:{player:true}}}}),
  db.marketTransaction.findMany({where:{leagueId:team.leagueId},orderBy:{createdAt:"desc"},take:5,include:{playerRegistration:{include:{player:true}},buyerTeam:{include:{userProfile:true}},sellerTeam:{include:{userProfile:true}}}})
 ]);
 const nextGame=games[0],nextRound=nextGame?.roundNumber??team.lineups[0]?.roundNumber??null,lineup=team.lineups.find(x=>x.roundNumber===nextRound)??team.lineups[0];
 const starters=lineup?.slots.filter(x=>x.role==="STARTER").length??0,substitutes=lineup?.slots.filter(x=>x.role==="SUBSTITUTE").length??0,locked=Boolean(lineup?.lockedAt)||Boolean(lineup&&lineup.cutoffAt<=now);
 const lineupState: "NOT_SAVED"|"LOCKED"|"READY"|"INCOMPLETE"=!lineup?"NOT_SAVED":locked?"LOCKED":starters===5&&substitutes===2?"READY":"INCOMPLETE";
 const movers=events.map(e=>({id:e.playerRegistrationId,name:e.playerRegistration.player.displayName,price:Number(e.newPrice),change:Number(e.newPrice-e.previousPrice),percentage:Number(e.newPrice-e.previousPrice)/Number(e.previousPrice)*100})).sort((a,b)=>Math.abs(b.percentage)-Math.abs(a.percentage)||Math.abs(b.change)-Math.abs(a.change)||a.name.localeCompare(b.name,"es")).slice(0,5);
 const position=team.total?.leaguePosition??team.total?.globalPosition??null,previous=team.total?.previousLeaguePosition??team.total?.previousGlobalPosition??null;
 return{kind:"READY" as const,displayName:profile.displayName,league:{id:team.league.id,name:team.league.name},leagues:profile.fantasyTeams.map(x=>({id:x.league.id,name:x.league.name})),competition:team.competitionSeason.competition.name,roster:{count:team.rosterSlots.length,balanceCredits:team.balanceCredits===null?null:Number(team.balanceCredits)},round:{number:nextRound,cutoffAt:lineup?.cutoffAt.toISOString()??nextGame?.scheduledAt?.toISOString()??null,lineupState,isLive:games.some(g=>liveStatuses.some(s=>(g.status||g.sourceStatus||"").toLowerCase().includes(s)))},performance:team.total?{points:team.total.lastRoundPoints.toString(),position,positionChange:position!==null&&previous!==null?previous-position:null}:null,movers,games:games.slice(0,4).map(g=>({id:g.id,home:g.homeTeam.name,away:g.awayTeam.name,scheduledAt:g.scheduledAt?.toISOString()??null})),activity:transactions.map(t=>({id:t.id,type:t.transactionType,player:t.playerRegistration.player.displayName,manager:t.buyerTeam?.userProfile.displayName??t.sellerTeam?.userProfile.displayName??"Manager Canastio",price:Number(t.priceCredits),createdAt:t.createdAt.toISOString()})),updatedAt:new Date().toISOString()};
}
