import { db } from "./db";
import { resolveActiveLeagueId } from "./private-leagues";
import { leagueRoundGames } from "./league-round-window";

export type JourneyPlayerState = "UPCOMING" | "LIVE" | "FINAL" | "DNP" | "PENDING";
export interface JourneyPlayer { id:string; name:string; fantasyPoints:string|null; points:number|null; assists:number|null; steals:number|null; state:JourneyPlayerState; stateLabel:string; statsState:"NONE"|"PARTIAL"|"FINAL"; statsUpdatedAt:string|null; }
export interface JourneyData { competition:string; league:string; roundNumber:number; roundDates?:string|null; rounds:number[]; state:"UPCOMING"|"LIVE"|"PROVISIONAL"|"FINAL"; stateLabel:string; totalPoints:string|null; revision:number|null; correction:{publishedAt:string;reason:string}|null; players:JourneyPlayer[]; cumulative:number[]; }

type Contribution={playerRegistrationId:string;displayName:string;points:string|null;status:string};
function contributions(value:unknown):Contribution[]{if(!value||typeof value!=="object")return[];const rows=(value as {starters?:unknown}).starters;return Array.isArray(rows)?rows.filter((row):row is Contribution=>!!row&&typeof row==="object"&&typeof (row as Contribution).playerRegistrationId==="string"):[];}

export async function getJourney(authUserId:string,requestedRound?:number,selectedLeagueId?:string):Promise<JourneyData|null>{
 const profile=await db.userProfile.findUnique({where:{authUserId},select:{id:true}});if(!profile)return null;
 const leagueId=selectedLeagueId??await resolveActiveLeagueId({authUserId});if(!leagueId)return null;
 const team=await db.fantasyTeam.findFirst({where:{userProfileId:profile.id,leagueId,league:{status:"ACTIVE",OR:[{competitionSeason:{fantasyEnabled:true}},{selectedSeasons:{some:{competitionSeason:{fantasyEnabled:true}}}}],memberships:{some:{userProfileId:profile.id,status:"ACTIVE"}}}},include:{league:true,competitionSeason:{include:{competition:true}}}});if(!team)return null;
 const games=await db.game.findMany({where:{competitionSeasonId:team.competitionSeasonId,syncStatus:"active",roundNumber:{not:null}},orderBy:{scheduledAt:"asc"},select:{id:true,roundNumber:true,status:true,sourceStatus:true,scheduledAt:true,homeTeamId:true,awayTeamId:true}});
 const rounds=[...new Set(games.map(game=>game.roundNumber).filter((round):round is number=>round!==null))].sort((a,b)=>b-a);
 const active=games.find(game=>game.status!=="finished")?.roundNumber??rounds[0]??1;const roundNumber=requestedRound&&rounds.includes(requestedRound)?requestedRound:active;
 const roundGames=(await leagueRoundGames(db,leagueId,roundNumber))?.games??[];
 const roundGameIds=roundGames.map(game=>game.id);
 const [lineup,roundScore,correction]=await Promise.all([
  db.fantasyLineup.findFirst({where:{fantasyTeamId:team.id,roundNumber,supersededAt:null},include:{slots:{where:{role:"STARTER"},orderBy:{ordinal:"asc"}}}}),
  db.fantasyRoundScore.findFirst({where:{fantasyTeamId:team.id,roundNumber,supersededAt:null},orderBy:{revision:"desc"}}),
  db.sportsDataRevision.findFirst({where:{status:"APPLIED",publicReason:{not:null},OR:[{gameId:{in:roundGameIds}},{playerGameStat:{gameId:{in:roundGameIds}}}]},orderBy:{appliedAt:"desc"},select:{appliedAt:true,publicReason:true}}),
 ]);
 const slots=lineup?.slots??[];const ids=slots.map(slot=>slot.playerRegistrationId);
 const stats=ids.length?await db.playerGameStat.findMany({where:{playerRegistrationId:{in:ids},gameId:{in:roundGameIds}},include:{game:true}}):[];
 const scoreByPlayer=new Map(contributions(roundScore?.breakdown).map(item=>[item.playerRegistrationId,item]));
 const players=slots.map((slot):JourneyPlayer=>{const own=stats.filter(stat=>stat.playerRegistrationId===slot.playerRegistrationId);const relatedGame=roundGames.find(game=>game.homeTeamId===slot.realTeamIdSnapshot||game.awayTeamId===slot.realTeamIdSnapshot);const contribution=scoreByPlayer.get(slot.playerRegistrationId);let state:JourneyPlayerState="UPCOMING";
  if(contribution?.status==="DNP")state="DNP";else if(relatedGame?.status==="finished")state=contribution?.points===null?"PENDING":"FINAL";else if(["live","in_progress","playing"].some(word=>(relatedGame?.status??relatedGame?.sourceStatus??"").toLowerCase().includes(word)))state="LIVE";
  const labels={UPCOMING:"Por jugar",LIVE:"En juego",FINAL:"Finalizado",DNP:"No participó",PENDING:"Puntuación pendiente"};
  const hasStats=own.length>0;const statsFinal=hasStats&&own.every(item=>item.game.statsSyncStatus==="stats_final");const updated=hasStats?own.map(item=>item.game.statsSyncedAt).filter((date):date is Date=>date!==null).sort((a,b)=>b.getTime()-a.getTime())[0]:null;
  const sum=(field:"points"|"assists"|"steals")=>hasStats?own.reduce((total,item)=>total+(item[field]??0),0):null;
  return{id:slot.playerRegistrationId,name:slot.displayNameSnapshot,fantasyPoints:contribution?.points??null,points:sum("points"),assists:sum("assists"),steals:sum("steals"),state,stateLabel:labels[state],statsState:statsFinal?"FINAL":hasStats?"PARTIAL":"NONE",statsUpdatedAt:updated?.toISOString()??null};});
 const hasLive=players.some(player=>player.state==="LIVE");const allFinished=roundGames.length>0&&roundGames.every(game=>game.status==="finished");const state=roundScore?.status==="PUBLISHED"?"FINAL":hasLive?"LIVE":allFinished?"PROVISIONAL":"UPCOMING";const labels={UPCOMING:"Próxima jornada",LIVE:"Jornada en curso",PROVISIONAL:"Resultados provisionales",FINAL:"Jornada finalizada"};
 let running=0;const cumulative:number[]=[];for(const player of players){if(player.fantasyPoints!==null){running+=Number(player.fantasyPoints);cumulative.push(running)}}
 const dated=roundGames.map(game=>game.scheduledAt).filter((date):date is Date=>date!==null);const formatter=new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short"});const roundDates=dated.length?`${formatter.format(dated[0])}${dated.length>1?` – ${formatter.format(dated.at(-1)!)}`:""}`:null;
 return{competition:team.competitionSeason.competition.name,league:team.league.name,roundNumber,roundDates,rounds,state,stateLabel:labels[state],totalPoints:roundScore?.points?.toString()??null,revision:roundScore?.revision??null,correction:correction?.appliedAt&&correction.publicReason?{publishedAt:correction.appliedAt.toISOString(),reason:correction.publicReason}:null,players,cumulative};
}
