import { db } from "./db";

export type JourneyPlayerState = "UPCOMING" | "LIVE" | "FINAL" | "DNP" | "PENDING";
export interface JourneyPlayer { id:string; name:string; fantasyPoints:string|null; points:number; assists:number; steals:number; state:JourneyPlayerState; stateLabel:string; }
export interface JourneyData { competition:string; league:string; roundNumber:number; rounds:number[]; state:"UPCOMING"|"LIVE"|"PROVISIONAL"|"FINAL"; stateLabel:string; totalPoints:string|null; revision:number|null; players:JourneyPlayer[]; cumulative:number[]; }

type Contribution={playerRegistrationId:string;displayName:string;points:string|null;status:string};
function contributions(value:unknown):Contribution[]{if(!value||typeof value!=="object")return[];const rows=(value as {starters?:unknown}).starters;return Array.isArray(rows)?rows.filter((row):row is Contribution=>!!row&&typeof row==="object"&&typeof (row as Contribution).playerRegistrationId==="string"):[];}

export async function getJourney(authUserId:string,requestedRound?:number):Promise<JourneyData|null>{
 const profile=await db.userProfile.findUnique({where:{authUserId},select:{id:true}});if(!profile)return null;
 const team=await db.fantasyTeam.findFirst({where:{userProfileId:profile.id,league:{status:"ACTIVE"}},orderBy:{updatedAt:"desc"},include:{league:true,competitionSeason:{include:{competition:true}}}});if(!team)return null;
 const games=await db.game.findMany({where:{competitionSeasonId:team.competitionSeasonId,syncStatus:"active",roundNumber:{not:null}},orderBy:{scheduledAt:"asc"},select:{id:true,roundNumber:true,status:true,sourceStatus:true,homeTeamId:true,awayTeamId:true}});
 const rounds=[...new Set(games.map(game=>game.roundNumber).filter((round):round is number=>round!==null))].sort((a,b)=>b-a);
 const active=games.find(game=>game.status!=="finished")?.roundNumber??rounds[0]??1;const roundNumber=requestedRound&&rounds.includes(requestedRound)?requestedRound:active;
 const [lineup,roundScore]=await Promise.all([
  db.fantasyLineup.findFirst({where:{fantasyTeamId:team.id,roundNumber,supersededAt:null},include:{slots:{where:{role:"STARTER"},orderBy:{ordinal:"asc"}}}}),
  db.fantasyRoundScore.findFirst({where:{fantasyTeamId:team.id,roundNumber,supersededAt:null},orderBy:{revision:"desc"}}),
 ]);
 const slots=lineup?.slots??[];const ids=slots.map(slot=>slot.playerRegistrationId);
 const stats=ids.length?await db.playerGameStat.findMany({where:{playerRegistrationId:{in:ids},game:{competitionSeasonId:team.competitionSeasonId,roundNumber}},include:{game:true}}):[];
 const scoreByPlayer=new Map(contributions(roundScore?.breakdown).map(item=>[item.playerRegistrationId,item]));
 const players=slots.map((slot):JourneyPlayer=>{const own=stats.filter(stat=>stat.playerRegistrationId===slot.playerRegistrationId);const relatedGame=games.find(game=>game.roundNumber===roundNumber&&(game.homeTeamId===slot.realTeamIdSnapshot||game.awayTeamId===slot.realTeamIdSnapshot));const contribution=scoreByPlayer.get(slot.playerRegistrationId);let state:JourneyPlayerState="UPCOMING";
  if(contribution?.status==="DNP")state="DNP";else if(relatedGame?.status==="finished")state=contribution?.points===null?"PENDING":"FINAL";else if(["live","in_progress","playing"].some(word=>(relatedGame?.status??relatedGame?.sourceStatus??"").toLowerCase().includes(word)))state="LIVE";
  const labels={UPCOMING:"Por jugar",LIVE:"En juego",FINAL:"Finalizado",DNP:"No participó",PENDING:"Calculando"};
  return{id:slot.playerRegistrationId,name:slot.displayNameSnapshot,fantasyPoints:contribution?.points??null,points:own.reduce((sum,item)=>sum+(item.points??0),0),assists:own.reduce((sum,item)=>sum+(item.assists??0),0),steals:own.reduce((sum,item)=>sum+(item.steals??0),0),state,stateLabel:labels[state]};});
 const roundGames=games.filter(game=>game.roundNumber===roundNumber);const hasLive=players.some(player=>player.state==="LIVE");const allFinished=roundGames.length>0&&roundGames.every(game=>game.status==="finished");const state=roundScore?.status==="PUBLISHED"?"FINAL":hasLive?"LIVE":allFinished?"PROVISIONAL":"UPCOMING";const labels={UPCOMING:"Próxima",LIVE:"En directo",PROVISIONAL:"Calculando",FINAL:"Finalizada"};
 let running=0;const cumulative=players.map(player=>{if(player.fantasyPoints!==null)running+=Number(player.fantasyPoints);return running;});
 return{competition:team.competitionSeason.competition.name,league:team.league.name,roundNumber,rounds,state,stateLabel:labels[state],totalPoints:roundScore?.points?.toString()??null,revision:roundScore?.revision??null,players,cumulative};
}
