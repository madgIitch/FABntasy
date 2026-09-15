import { Prisma } from "@prisma/client";
import { decodeActivityCursor, encodeActivityCursor, isLeagueEventType, isLeagueReaction, REACTION_CATALOG, SOCIAL_EVENT_PAYLOAD_VERSION, SOCIAL_RULES_VERSION, sharedRoundRange, rivalryReason, type LeagueEventType, type SocialEventPayload } from "../../../../packages/domain/social-league";
import { avatarUrl } from "../lib/avatar";
import { db } from "./db";

export class SocialLeagueError extends Error { constructor(public code: "AUTH_REQUIRED"|"LEAGUE_NOT_FOUND"|"EVENT_NOT_FOUND"|"MEMBER_NOT_FOUND"|"PLAYER_NOT_FOUND"|"RESOURCE_NOT_FOUND"|"INVALID_INPUT"|"FEATURE_DISABLED", public status=400){super(code);} }
const fail=(code:SocialLeagueError["code"],status=400):never=>{throw new SocialLeagueError(code,status)};
const socialEnabled=()=>process.env.SOCIAL_LEAGUE_ENABLED!=="false";
export type SocialActor={authUserId:string};

async function memberContext(client:Prisma.TransactionClient|typeof db,actor:SocialActor,leagueId:string){
  const profile=await client.userProfile.findUnique({where:{authUserId:actor.authUserId},select:{id:true}});
  if(!profile)throw new SocialLeagueError("AUTH_REQUIRED",401);
  const membership=await client.leagueMembership.findFirst({where:{leagueId,userProfileId:profile.id,status:"ACTIVE",league:{status:"ACTIVE"}},select:{id:true}});
  if(!membership)throw new SocialLeagueError("LEAGUE_NOT_FOUND",404);
  return {profileId:profile.id};
}

export async function appendLeagueEvent(tx:Prisma.TransactionClient,input:{leagueId:string;type:LeagueEventType;occurredAt?:Date;actorProfileId?:string|null;sourceType:string;sourceId:string;payload:Omit<SocialEventPayload,"version">;backfill?:boolean}){
  if(!isLeagueEventType(input.type))fail("INVALID_INPUT",422);
  return tx.leagueActivityEvent.upsert({where:{leagueId_sourceType_sourceId_type:{leagueId:input.leagueId,sourceType:input.sourceType,sourceId:input.sourceId,type:input.type}},update:{},create:{leagueId:input.leagueId,type:input.type,occurredAt:input.occurredAt??new Date(),actorProfileId:input.actorProfileId??null,payloadVersion:SOCIAL_EVENT_PAYLOAD_VERSION,payload:{version:SOCIAL_EVENT_PAYLOAD_VERSION,...input.payload} as Prisma.InputJsonValue,sourceType:input.sourceType,sourceId:input.sourceId,backfill:input.backfill??false}});
}

export async function listActivity(actor:SocialActor,leagueId:string,input:{cursor?:string|null;limit?:number}={}){
  if(!socialEnabled())return {items:[],nextCursor:null,reactionCatalog:REACTION_CATALOG};
  const {profileId}=await memberContext(db,actor,leagueId); const limit=Math.min(Math.max(input.limit??20,1),50); const cursor=decodeActivityCursor(input.cursor);
  if(input.cursor&&!cursor)fail("INVALID_INPUT",422);
  const rows=await db.leagueActivityEvent.findMany({where:{leagueId,...(cursor?{OR:[{occurredAt:{lt:cursor.occurredAt}},{occurredAt:cursor.occurredAt,id:{lt:cursor.id}}]}:{})},orderBy:[{occurredAt:"desc"},{id:"desc"}],take:limit+1,include:{reactions:{select:{emoji:true,userProfileId:true}},actorProfile:{select:{username:true,displayName:true,avatarPath:true}}}});
  const hasMore=rows.length>limit; const page=rows.slice(0,limit);
  return {items:page.map(row=>{const counts=Object.fromEntries(REACTION_CATALOG.map(emoji=>[emoji,row.reactions.filter(r=>r.emoji===emoji).length]));return {id:row.id,type:row.type,occurredAt:row.occurredAt.toISOString(),actor:row.actorProfile?{name:row.actorProfile.username?`@${row.actorProfile.username}`:row.actorProfile.displayName??"Manager",publicManagerId:row.actorProfile.username,avatarUrl:avatarUrl(row.actorProfile.avatarPath)}:null,payload:row.payload,reactions:counts,myReactions:row.reactions.filter(r=>r.userProfileId===profileId).map(r=>r.emoji)};}),nextCursor:hasMore?encodeActivityCursor(page[page.length-1].occurredAt,page[page.length-1].id):null,reactionCatalog:REACTION_CATALOG};
}

export async function toggleReaction(actor:SocialActor,leagueId:string,eventId:string,emoji:unknown){
  if(!socialEnabled())throw new SocialLeagueError("FEATURE_DISABLED",404); if(!isLeagueReaction(emoji))throw new SocialLeagueError("INVALID_INPUT",422);
  const validEmoji=emoji;
  return db.$transaction(async tx=>{const {profileId}=await memberContext(tx,actor,leagueId);const event=await tx.leagueActivityEvent.findFirst({where:{id:eventId,leagueId},select:{id:true}});if(!event)throw new SocialLeagueError("EVENT_NOT_FOUND",404);const key={eventId_userProfileId_emoji:{eventId,userProfileId:profileId,emoji:validEmoji}};const prior=await tx.leagueEventReaction.findUnique({where:key});if(prior){await tx.leagueEventReaction.delete({where:{id:prior.id}});}else{await tx.leagueEventReaction.create({data:{eventId,userProfileId:profileId,emoji:validEmoji}});}const grouped=await tx.leagueEventReaction.groupBy({by:["emoji"],where:{eventId},_count:{_all:true}});return {active:!prior,emoji:validEmoji,counts:Object.fromEntries(REACTION_CATALOG.map(item=>[item,grouped.find(g=>g.emoji===item)?._count._all??0]))};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

export async function heartbeatPresence(actor:SocialActor,leagueId:string,sessionId:string){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId))fail("INVALID_INPUT",422);
  const {profileId}=await memberContext(db,actor,leagueId);const expiresAt=new Date(Date.now()+90_000);
  await db.leaguePresence.upsert({where:{leagueId_userProfileId_sessionId:{leagueId,userProfileId:profileId,sessionId}},create:{leagueId,userProfileId:profileId,sessionId,expiresAt},update:{expiresAt}});
  await db.leaguePresence.deleteMany({where:{leagueId,expiresAt:{lte:new Date()}}});return {activeCount:await db.leaguePresence.count({where:{leagueId,expiresAt:{gt:new Date()}}}),expiresAt:expiresAt.toISOString()};
}

export async function getMembers(actor:SocialActor,leagueId:string,input:{cursor?:string|null;limit?:number}={}){
  await memberContext(db,actor,leagueId);const limit=Math.min(Math.max(input.limit??20,1),50);
  const members=await db.leagueMembership.findMany({where:{leagueId,status:"ACTIVE"},orderBy:[{joinedAt:"asc"},{id:"asc"}],...(input.cursor?{cursor:{id:input.cursor},skip:1}:{}),take:limit+1,include:{userProfile:true}});
  const page=members.slice(0,limit);const teams=await db.fantasyTeam.findMany({where:{leagueId,userProfileId:{in:page.map(m=>m.userProfileId)}},include:{total:true,rosterSlots:{include:{playerRegistration:{include:{prices:{orderBy:{updatedAt:"desc"},take:1}}}}},roundScores:{where:{status:"PUBLISHED"},orderBy:{roundNumber:"asc"}},userProfile:true}});
  const ordered=[...teams].sort((a,b)=>Number(b.total?.totalPoints??0)-Number(a.total?.totalPoints??0));
  const items=await Promise.all(page.map(async member=>{const team=teams.find(t=>t.userProfileId===member.userProfileId);const wins=team?.roundScores.filter(score=>{const max=Math.max(...teams.map(t=>Number(t.roundScores.find(r=>r.roundNumber===score.roundNumber)?.points??Number.NEGATIVE_INFINITY)));return Number(score.points)===max;}).length??0;return {membershipId:member.id,publicManagerId:member.userProfile.username,name:member.userProfile.username?`@${member.userProfile.username}`:member.userProfile.displayName??"Manager",avatarUrl:avatarUrl(member.userProfile.avatarPath),role:member.role,teamName:team?.name??"Equipo pendiente",position:team?ordered.findIndex(t=>t.id===team.id)+1:null,currentRosterValue:team?team.rosterSlots.reduce((sum,s)=>sum+Number(s.playerRegistration.prices[0]?.currentPrice??0),0):null,totalPoints:team?.total?Number(team.total.totalPoints):null,roundsWon:wins,bestRound:team?.roundScores.length?Math.max(...team.roundScores.map(s=>Number(s.points??0))):null,streak:null,trophies:team?awaitAwards(team.userProfileId,leagueId):[]};}));return {items,nextCursor:members.length>limit?page[page.length-1].id:null};
}
async function awaitAwards(userProfileId:string,leagueId:string){return db.leagueAchievementAward.findMany({where:{userProfileId,leagueId,status:"ACTIVE"},select:{achievementType:true,awardedAt:true}});}

export async function getHeadToHead(actor:SocialActor,leagueId:string,leftProfileId:string,rightProfileId:string){
  await memberContext(db,actor,leagueId);if(leftProfileId===rightProfileId)fail("INVALID_INPUT",422);
  const memberships=await db.leagueMembership.count({where:{leagueId,userProfileId:{in:[leftProfileId,rightProfileId]},status:"ACTIVE"}});if(memberships!==2)fail("MEMBER_NOT_FOUND",404);
  const teams=await db.fantasyTeam.findMany({where:{leagueId,userProfileId:{in:[leftProfileId,rightProfileId]}},include:{userProfile:true,roundScores:{where:{status:"PUBLISHED"},orderBy:{roundNumber:"asc"}},rosterSlots:{include:{playerRegistration:{include:{prices:{orderBy:{updatedAt:"desc"},take:1}}}}},league:{select:{competitionSeasonId:true}}}});if(teams.length!==2)fail("MEMBER_NOT_FOUND",404);
  const range=sharedRoundRange(teams[0].roundScores.map(r=>r.roundNumber),teams[1].roundScores.map(r=>r.roundNumber));if(!range)return {comparable:false,reason:"No hay jornadas publicadas compartidas."};
  const summarize=(team:typeof teams[number],opponent:typeof teams[number])=>{const rounds=team.roundScores.filter(r=>range.rounds.includes(r.roundNumber));let wins=0,draws=0,losses=0;for(const score of rounds){const other=opponent.roundScores.find(r=>r.roundNumber===score.roundNumber)!;const diff=Number(score.points)-Number(other.points);if(diff>0){wins++;}else if(diff<0){losses++;}else{draws++;}}const positions=rounds.map(score=>1+teams.filter(candidate=>Number(candidate.roundScores.find(row=>row.roundNumber===score.roundNumber)?.points??Number.NEGATIVE_INFINITY)>Number(score.points)).length);return {userProfileId:team.userProfileId,name:team.userProfile.username?`@${team.userProfile.username}`:team.userProfile.displayName??"Manager",points:rounds.reduce((sum,r)=>sum+Number(r.points),0),roundsWon:wins,averagePosition:positions.reduce((sum,value)=>sum+value,0)/positions.length,rosterValue:team.rosterSlots.reduce((sum,s)=>sum+Number(s.playerRegistration.prices[0]?.currentPrice??0),0),record:{wins,draws,losses}};};
  const left=summarize(teams[0],teams[1]),right=summarize(teams[1],teams[0]);return {comparable:true,seasonId:teams[0].league.competitionSeasonId,roundRange:{from:range.from,to:range.to,count:range.rounds.length},left,right,rivalry:{ruleVersion:SOCIAL_RULES_VERSION,reason:rivalryReason({positionGap:Math.abs((left.averagePosition??0)-(right.averagePosition??0)),pointsGap:Math.abs(left.points-right.points),sharedRounds:range.rounds.length}),score:`${left.record.wins}-${right.record.wins}`,difference:Math.abs(left.points-right.points)}};
}

export async function togglePlayerFollow(actor:SocialActor,playerRegistrationId:string,follow:boolean){const profile=await db.userProfile.findUnique({where:{authUserId:actor.authUserId},select:{id:true}});if(!profile)throw new SocialLeagueError("AUTH_REQUIRED",401);const player=await db.playerRegistration.findUnique({where:{id:playerRegistrationId},select:{competitionSeasonId:true}});if(!player)throw new SocialLeagueError("PLAYER_NOT_FOUND",404);if(follow)await db.playerFollow.upsert({where:{userProfileId_playerRegistrationId:{userProfileId:profile.id,playerRegistrationId}},create:{userProfileId:profile.id,playerRegistrationId,competitionSeasonId:player.competitionSeasonId},update:{}});else await db.playerFollow.deleteMany({where:{userProfileId:profile.id,playerRegistrationId}});return {following:follow};}
