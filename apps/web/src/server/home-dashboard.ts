import { db } from "./db";

export type SectionState = "READY" | "EMPTY" | "ERROR";
export type HomeDashboard = Awaited<ReturnType<typeof getHomeDashboard>>;
type PriceEvent = { playerRegistrationId:string; roundNumber:number; previousPrice:bigint; newPrice:bigint; createdAt:Date; playerPrice:{currentPrice:bigint}; playerRegistration:{player:{displayName:string}} };
const liveStatuses = ["live", "playing", "in_progress"];
const iso = (value: Date) => value.toISOString();

export function buildMarketMovers(events: PriceEvent[]) {
  const latest = new Map<string, PriceEvent>();
  for (const event of events) if (!latest.has(event.playerRegistrationId)) latest.set(event.playerRegistrationId, event);
  return [...latest.values()].filter((event) => event.previousPrice > 0n && event.newPrice !== event.previousPrice).map((event) => {
    const change = Number(event.newPrice - event.previousPrice);
    return { id:event.playerRegistrationId, name:event.playerRegistration.player.displayName, price:Number(event.playerPrice.currentPrice), change, percentage:change / Number(event.previousPrice) * 100, period:`Jornada ${event.roundNumber}` };
  }).sort((a,b) => Math.abs(b.percentage)-Math.abs(a.percentage) || Math.abs(b.change)-Math.abs(a.change) || a.name.localeCompare(b.name,"es")).slice(0,5);
}

async function section<T>(load:()=>Promise<T>) {
  try { return { state:"READY" as SectionState, updatedAt:new Date().toISOString(), data:await load() }; }
  catch (error) { console.error("[home-dashboard] section_failed", error); return { state:"ERROR" as SectionState, updatedAt:null, data:null }; }
}

export async function getHomeDashboard(authUserId:string, requestedLeagueId?:string) {
  const updatedAt = new Date().toISOString();
  try {
    const profile = await db.userProfile.findUnique({ where:{authUserId}, include:{ fantasyTeams:{ where:{league:{status:"ACTIVE"}}, orderBy:{updatedAt:"desc"}, include:{ league:true, competitionSeason:{include:{competition:true}}, rosterSlots:{include:{playerRegistration:{include:{teamRegistration:true}}}}, lineups:{where:{supersededAt:null},orderBy:{roundNumber:"desc"},take:2,include:{slots:true}}, total:true } } } });
    if (!profile) return {kind:"NO_PROFILE" as const,updatedAt};
    if (requestedLeagueId && !profile.fantasyTeams.some((item)=>item.leagueId===requestedLeagueId)) return {kind:"CRITICAL_ERROR" as const,code:"LEAGUE_NOT_AVAILABLE",updatedAt};
    const team=profile.fantasyTeams.find((item)=>item.leagueId===requestedLeagueId)??profile.fantasyTeams[0];
    if (!team) return {kind:"NO_TEAM" as const,displayName:profile.displayName,updatedAt};
    const now=new Date();
    const realTeamIds=[...new Set(team.rosterSlots.map((slot)=>slot.playerRegistration.teamRegistration.teamId))];
    const gamesResult=await section(()=>db.game.findMany({where:{competitionSeasonId:team.competitionSeasonId,syncStatus:"active",AND:[{OR:[{status:{in:liveStatuses}},{scheduledAt:{gte:now}}]},...(realTeamIds.length?[{OR:[{homeTeamId:{in:realTeamIds}},{awayTeamId:{in:realTeamIds}}]}]:[])]},orderBy:[{scheduledAt:"asc"},{id:"asc"}],take:12,include:{homeTeam:true,awayTeam:true}}));
    const playedGamesResult=await section(()=>db.game.findMany({where:{competitionSeasonId:team.competitionSeasonId,syncStatus:"active",status:"finished",...(realTeamIds.length?{OR:[{homeTeamId:{in:realTeamIds}},{awayTeamId:{in:realTeamIds}}]}:{})},orderBy:[{scheduledAt:"desc"},{id:"desc"}],take:4,include:{homeTeam:true,awayTeam:true}}));
    const nextGame=gamesResult.data?.[0], nextRound=nextGame?.roundNumber??team.lineups[0]?.roundNumber??null, lineup=team.lineups.find((item)=>item.roundNumber===nextRound)??team.lineups[0];
    const starters=lineup?.slots.filter((slot)=>slot.role==="STARTER").length??0, locked=Boolean(lineup?.lockedAt)||Boolean(lineup&&lineup.cutoffAt<=now);
    const lineupState:"NO_CALENDAR"|"NOT_SAVED"|"LOCKED"|"READY"|"INCOMPLETE"=nextRound===null?"NO_CALENDAR":!lineup?"NOT_SAVED":locked?"LOCKED":starters===5?"READY":"INCOMPLETE";
    const [scoresResult,marketResult,activityResult]=await Promise.all([
      section(()=>db.fantasyRoundScore.findMany({where:{fantasyTeamId:team.id,status:"PUBLISHED",supersededAt:null,points:{not:null}},orderBy:[{roundNumber:"desc"},{revision:"desc"}],take:2})),
      section(()=>db.playerPriceEvent.findMany({where:{competitionSeasonId:team.competitionSeasonId,previousPrice:{gt:0}},orderBy:[{createdAt:"desc"},{id:"asc"}],take:100,include:{playerPrice:{select:{currentPrice:true}},playerRegistration:{include:{player:true}}}})),
      section(()=>db.marketTransaction.findMany({where:{leagueId:team.leagueId},orderBy:[{createdAt:"desc"},{id:"desc"}],take:8,include:{playerRegistration:{include:{player:true}},buyerTeam:{include:{userProfile:true}},sellerTeam:{include:{userProfile:true}}}})),
    ]);
    const scores=scoresResult.data??[], latestScore=scores[0], position=latestScore?(team.total?.leaguePosition??team.total?.globalPosition??null):null, previousPosition=latestScore?(team.total?.previousLeaguePosition??team.total?.previousGlobalPosition??null):null;
    const uniqueGames=[...new Map((gamesResult.data??[]).map((game)=>[game.id,game])).values()].slice(0,4);
    const activity=activityResult.data?.map((transaction)=>{ const owner=transaction.transactionType==="SELL"?transaction.sellerTeam?.userProfile:transaction.buyerTeam?.userProfile; return {id:transaction.id,type:transaction.transactionType,player:transaction.playerRegistration.player.displayName,manager:owner?.username?`@${owner.username}`:owner?.displayName??"Usuario sin nombre",price:Number(transaction.priceCredits),createdAt:iso(transaction.createdAt)}; })??null;
    const stateOf=(failed:boolean,hasData:boolean):SectionState=>failed?"ERROR":hasData?"READY":"EMPTY";
    return {kind:"READY" as const,schemaVersion:"canastio.home.v1",displayName:profile.displayName,league:{id:team.league.id,name:team.league.name},leagues:profile.fantasyTeams.map((item)=>({id:item.league.id,name:item.league.name})),competition:team.competitionSeason.competition.name,roster:{count:team.rosterSlots.length,balanceCredits:team.balanceCredits===null?null:Number(team.balanceCredits)},round:{number:nextRound,cutoffAt:lineup?.cutoffAt?iso(lineup.cutoffAt):nextGame?.scheduledAt?iso(nextGame.scheduledAt):null,lineupState,isLive:(gamesResult.data??[]).some((game)=>liveStatuses.some((status)=>(game.status||game.sourceStatus||"").toLowerCase().includes(status)))},performance:{state:stateOf(scoresResult.state==="ERROR",Boolean(latestScore)),updatedAt:latestScore?.publishedAt?iso(latestScore.publishedAt):scoresResult.updatedAt,data:latestScore?{roundNumber:latestScore.roundNumber,points:latestScore.points!.toString(),position,positionChange:position!==null&&previousPosition!==null?previousPosition-position:null}:null},market:{state:stateOf(marketResult.state==="ERROR",Boolean(marketResult.data?.length)),updatedAt:marketResult.data?.[0]?.createdAt?iso(marketResult.data[0].createdAt):marketResult.updatedAt,data:marketResult.data?buildMarketMovers(marketResult.data):null},games:{state:stateOf(gamesResult.state==="ERROR",Boolean(uniqueGames.length)),updatedAt:gamesResult.updatedAt,data:uniqueGames.map((game)=>({id:game.id,home:game.homeTeam.name,away:game.awayTeam.name,scheduledAt:game.scheduledAt?iso(game.scheduledAt):null,status:game.sourceStatus??game.status}))},playedGames:{state:stateOf(playedGamesResult.state==="ERROR",Boolean(playedGamesResult.data?.length)),updatedAt:playedGamesResult.updatedAt,data:playedGamesResult.data?.map((game)=>({id:game.id,home:game.homeTeam.name,away:game.awayTeam.name,homeScore:game.homeScore,awayScore:game.awayScore,scheduledAt:game.scheduledAt?iso(game.scheduledAt):null}))??null},activity:{state:stateOf(activityResult.state==="ERROR",Boolean(activity?.length)),updatedAt:activityResult.data?.[0]?.createdAt?iso(activityResult.data[0].createdAt):activityResult.updatedAt,data:activity},updatedAt};
  } catch (error) { console.error("[home-dashboard] critical_load_failed",error); return {kind:"CRITICAL_ERROR" as const,code:"DASHBOARD_UNAVAILABLE",updatedAt}; }
}
