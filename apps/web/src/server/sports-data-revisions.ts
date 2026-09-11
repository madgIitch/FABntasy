import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { AdminError, requireIngestionAdmin } from "./ingestion-admin";
import { recomputeRound } from "./fantasy-scoring";
import { recomputePlayerPrices } from "./player-pricing";

export const REVISION_TARGETS = ["GAME", "PLAYER_GAME_STAT"] as const;
export const REVISION_SOURCES = ["SOURCE_CORRECTION", "MANUAL_OVERRIDE"] as const;
export const GAME_FIELDS = ["scheduledAt", "status", "sourceStatus", "homeScore", "awayScore", "hasStatistics"] as const;
export const STAT_FIELDS = ["starter", "minutesPlayed", "millisecondsPlayed", "points", "freeThrowsMade", "freeThrowsAttempted", "twoPointersMade", "twoPointersAttempted", "threePointersMade", "threePointersAttempted", "offensiveRebounds", "defensiveRebounds", "rebounds", "assists", "steals", "turnovers", "blocks", "blocksReceived", "foulsCommitted", "foulsReceived", "technicalFouls", "valuation", "plusMinus"] as const;
type Target = typeof REVISION_TARGETS[number];
type Source = typeof REVISION_SOURCES[number];
type Input = { targetType?: unknown; targetId?: unknown; sourceType?: unknown; fieldName?: unknown; value?: unknown; internalReason?: unknown; publicReason?: unknown; idempotencyKey?: unknown };

export class RevisionError extends AdminError {}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const uuid = (value: unknown) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function parseValue(target: Target, field: string, value: unknown): string | number | boolean | null {
  if (value === "" || value === null) { if (["status","hasStatistics"].includes(field)) throw new RevisionError("INVALID_VALUE",422); return null; }
  if (target === "GAME" && field === "scheduledAt") { const date = new Date(String(value)); if (Number.isNaN(date.getTime())) throw new RevisionError("INVALID_VALUE", 422); return date.toISOString(); }
  if (["status", "sourceStatus"].includes(field)) { if (typeof value !== "string" || !value.trim() || value.length > 80) throw new RevisionError("INVALID_VALUE", 422); return value.trim(); }
  if (["hasStatistics", "starter"].includes(field)) { if (typeof value === "boolean") return value; if (value === "true" || value === "false") return value === "true"; throw new RevisionError("INVALID_VALUE", 422); }
  const number = Number(value); if (!Number.isFinite(number) || number < 0 && field !== "plusMinus" || !["minutesPlayed"].includes(field) && !Number.isInteger(number)) throw new RevisionError("INVALID_VALUE", 422); return number;
}

export function parseRevisionInput(input: Input) {
  const targetType = input.targetType as Target, sourceType = input.sourceType as Source, fieldName = String(input.fieldName ?? "");
  if (!REVISION_TARGETS.includes(targetType) || !REVISION_SOURCES.includes(sourceType) || !uuid(input.targetId)) throw new RevisionError("INVALID_REVISION", 422);
  const allowed = targetType === "GAME" ? GAME_FIELDS : STAT_FIELDS;
  if (!(allowed as readonly string[]).includes(fieldName)) throw new RevisionError("FIELD_NOT_ALLOWED", 422);
  const internalReason = typeof input.internalReason === "string" ? input.internalReason.trim().slice(0, 500) : "";
  if (!internalReason || sourceType === "MANUAL_OVERRIDE" && internalReason.length < 8) throw new RevisionError("REASON_REQUIRED", 422);
  const publicReason = typeof input.publicReason === "string" && input.publicReason.trim() ? input.publicReason.trim().slice(0, 240) : null;
  const idempotencyKey = typeof input.idempotencyKey === "string" && /^[a-zA-Z0-9:_-]{8,191}$/.test(input.idempotencyKey) ? input.idempotencyKey : crypto.randomUUID();
  return { targetType, targetId: input.targetId as string, sourceType, fieldName, value: parseValue(targetType, fieldName, input.value), internalReason, publicReason, idempotencyKey };
}

async function current(targetType: Target, targetId: string) {
  if (targetType === "GAME") { const row = await db.game.findUnique({ where: { id: targetId }, select: { id:true, competitionSeasonId:true, roundNumber:true, scheduledAt:true,status:true,sourceStatus:true,homeScore:true,awayScore:true,hasStatistics:true,homeTeam:{select:{name:true}},awayTeam:{select:{name:true}} } }); if (!row) throw new RevisionError("RESOURCE_NOT_FOUND",404); return { row, gameId: row.id, label:`${row.homeTeam.name} – ${row.awayTeam.name}` }; }
  const row = await db.playerGameStat.findUnique({ where:{id:targetId}, include:{game:{select:{id:true,competitionSeasonId:true,roundNumber:true}},playerRegistration:{select:{player:{select:{displayName:true}}}}} });
  if (!row) throw new RevisionError("RESOURCE_NOT_FOUND",404); return { row, gameId:row.game.id,label:row.playerRegistration.player.displayName };
}

export async function previewRevision(actorProfileId: string, raw: Input) {
  const input=parseRevisionInput(raw), resource=await current(input.targetType,input.targetId), before=(resource.row as Record<string,unknown>)[input.fieldName] ?? null;
  const snapshot={ field:input.fieldName, value:before instanceof Date?before.toISOString():before }, after={field:input.fieldName,value:input.value};
  if (JSON.stringify(snapshot.value)===JSON.stringify(after.value)) throw new RevisionError("NO_CHANGE",409);
  const game = input.targetType === "GAME" ? resource.row as {competitionSeasonId:string;roundNumber:number|null} : (resource.row as {game:{competitionSeasonId:string;roundNumber:number|null}}).game;
  const impact={competitionSeasonId:game.competitionSeasonId,roundNumber:game.roundNumber,gameId:resource.gameId,recomputes:game.roundNumber?["PLAYER_SCORES","ROUND_SCORES","RANKINGS","PRICES"]:[]};
  try { const revision=await db.$transaction(async tx=>{const created=await tx.sportsDataRevision.create({data:{targetType:input.targetType,targetId:input.targetId,gameId:input.targetType==="GAME"?input.targetId:null,playerGameStatId:input.targetType==="PLAYER_GAME_STAT"?input.targetId:null,sourceType:input.sourceType,fieldName:input.fieldName,beforeSnapshot:snapshot as Prisma.InputJsonValue,afterSnapshot:after as Prisma.InputJsonValue,expectedFingerprint:hash(snapshot),idempotencyKey:input.idempotencyKey,internalReason:input.internalReason,publicReason:input.publicReason,impact:impact as Prisma.InputJsonValue,actorProfileId}});await tx.adminAuditEvent.create({data:{actorProfileId,action:"DATA_REVISION_PREVIEW",resourceType:"SPORTS_DATA_REVISION",resourceId:created.id,result:"SUCCESS",reason:input.internalReason.slice(0,240)}});return created});return {revision,label:resource.label,diff:{before:snapshot.value,after:after.value},impact}; }
  catch(error){if((error as {code?:string}).code==="P2002"){const revision=await db.sportsDataRevision.findUnique({where:{idempotencyKey:input.idempotencyKey}});if(revision)return {revision,label:resource.label,diff:{before:snapshot.value,after:after.value},impact,replayed:true};}throw error;}
}

export async function applyRevision(actorProfileId:string,id:string){if(!uuid(id))throw new RevisionError("INVALID_REVISION",422);
  const result=await db.$transaction(async tx=>{await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${id}))`);const revision=await tx.sportsDataRevision.findUnique({where:{id}});if(!revision)throw new RevisionError("REVISION_NOT_FOUND",404);if(revision.actorProfileId!==actorProfileId)throw new RevisionError("REVISION_NOT_FOUND",404);if(revision.status==="APPLIED")return {revision,replayed:true};if(revision.status!=="PROPOSED")throw new RevisionError("INVALID_STATE",409);
    const resource=revision.targetType==="GAME"?await tx.game.findUnique({where:{id:revision.targetId}}):await tx.playerGameStat.findUnique({where:{id:revision.targetId}});if(!resource)throw new RevisionError("RESOURCE_NOT_FOUND",404);const actual=(resource as Record<string,unknown>)[revision.fieldName]??null;const normalized=actual instanceof Date?actual.toISOString():actual;if(hash({field:revision.fieldName,value:normalized})!==revision.expectedFingerprint)throw new RevisionError("REVISION_CONFLICT",409);const after=(revision.afterSnapshot as {value:unknown}).value;
    if(revision.targetType==="GAME")await tx.game.update({where:{id:revision.targetId},data:{[revision.fieldName]:revision.fieldName==="scheduledAt"&&after?new Date(String(after)):after} as Prisma.GameUpdateInput});else await tx.playerGameStat.update({where:{id:revision.targetId},data:{[revision.fieldName]:after} as Prisma.PlayerGameStatUpdateInput});
    const applied=await tx.sportsDataRevision.update({where:{id},data:{status:"APPLIED",appliedAt:new Date(),recomputationStatus:"RUNNING"}});await tx.adminAuditEvent.create({data:{actorProfileId,action:"DATA_REVISION_APPLY",resourceType:"SPORTS_DATA_REVISION",resourceId:id,result:"SUCCESS",reason:revision.internalReason.slice(0,240)}});return {revision:applied,replayed:false};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if(!result.replayed){const impact=result.revision.impact as {competitionSeasonId:string;roundNumber:number|null};try{if(impact.roundNumber){const rule=await db.fantasyScoringRuleSet.findFirst({where:{competitionSeasonId:impact.competitionSeasonId,status:"ACTIVE"},orderBy:{publishedAt:"desc"}});if(rule){await recomputeRound(impact.competitionSeasonId,impact.roundNumber,rule.id);await recomputePlayerPrices(impact.competitionSeasonId,impact.roundNumber);}}await db.sportsDataRevision.update({where:{id},data:{recomputationStatus:"SUCCEEDED"}});}catch{await db.sportsDataRevision.update({where:{id},data:{recomputationStatus:"FAILED",recomputationError:"RECOMPUTATION_FAILED"}});throw new RevisionError("RECOMPUTATION_FAILED",503);}}
  return result;
}

export async function listRevisions(){return db.sportsDataRevision.findMany({orderBy:{createdAt:"desc"},take:50,include:{actor:{select:{username:true,displayName:true}}}});}
export async function requireRevisionAdmin(authUserId:string){return requireIngestionAdmin(authUserId);}

export async function previewReversal(actorProfileId:string,id:string,reason:string){if(!uuid(id)||!reason.trim())throw new RevisionError("REASON_REQUIRED",422);const prior=await db.sportsDataRevision.findUnique({where:{id}});if(!prior||prior.status!=="APPLIED")throw new RevisionError("REVISION_NOT_FOUND",404);const before=prior.beforeSnapshot as {value:unknown};const proposal=await previewRevision(actorProfileId,{targetType:prior.targetType,targetId:prior.targetId,sourceType:"MANUAL_OVERRIDE",fieldName:prior.fieldName,value:before.value,internalReason:reason,publicReason:prior.publicReason,idempotencyKey:`revert:${id}:${hash(reason).slice(0,24)}`});await db.sportsDataRevision.update({where:{id:proposal.revision.id},data:{revertsRevisionId:id}});await db.adminAuditEvent.create({data:{actorProfileId,action:"DATA_REVISION_REVERT_PREVIEW",resourceType:"SPORTS_DATA_REVISION",resourceId:proposal.revision.id,result:"SUCCESS",reason:reason.slice(0,240)}});return proposal;}
