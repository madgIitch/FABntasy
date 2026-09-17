import { describe, expect, it } from "vitest";
import { boundedRaw, buildCompetitionTeamIndexes, classifyIngestionError, parseJob, parseMonitoringUpdate, RECENT_CATALOG_ORDER, redactRaw } from "./ingestion-admin";
describe("ingestion admin contracts",()=>{
 it("redacts secrets recursively and case-insensitively",()=>{expect(redactRaw({key:"x",nested:{ID_DISPOSITIVO:"y",players:[{token:"z",name:"Ana"}]}})).toEqual({key:"[REDACTED]",nested:{ID_DISPOSITIVO:"[REDACTED]",players:[{token:"[REDACTED]",name:"Ana"}]}})});
 it("bounds raw output",()=>{expect(boundedRaw({value:"x".repeat(300000)}).truncated).toBe(true)});
 it("validates normalized job targets",()=>{expect(parseJob({type:"GAME",target:{gameId:"abc-123"}})).toMatchObject({targetKey:"gameId:abc-123"});expect(parseJob({type:"ROUND",target:{categoryId:"cat-1",roundNumber:4}})).toMatchObject({targetKey:"categoryId:cat-1:round:4"});expect(()=>parseJob({type:"GAME",target:{gameId:"https://bad"}})).toThrow("INVALID_TARGET")});
 it("classifies safe error families",()=>{expect(classifyIngestionError("FAB_CREDENTIAL_EXPIRED")).toBe("FAB_AUTH");expect(classifyIngestionError("DATABASE_ERROR")).toBe("DATABASE");expect(classifyIngestionError("BOX_SCORE_INCOMPLETE")).toBe("NORMALIZATION")});
 it("validates catalog monitoring mutations",()=>{const id="960959d8-60ba-4bd4-92d0-a14a9aea1ace";expect(parseMonitoringUpdate(id,true)).toEqual({catalogId:id,monitored:true});expect(()=>parseMonitoringUpdate("10468",true)).toThrow("INVALID_TARGET");expect(()=>parseMonitoringUpdate(id,"true")).toThrow("INVALID_TARGET")});
 it("orders the catalog by latest discovery or change with a stable FAB ID tie-break",()=>{
  expect(RECENT_CATALOG_ORDER).toEqual([{lastChangedAt:"desc"},{categoryCompetitionId:"asc"}]);
  expect(RECENT_CATALOG_ORDER).not.toEqual(expect.arrayContaining([expect.objectContaining({monitored:expect.anything()}),expect.objectContaining({lastCheckedAt:expect.anything()})]));
 });
});

describe("monitored competition team index",()=>{
 const now=new Date("2026-09-16T12:00:00.000Z"),season="11111111-1111-4111-8111-111111111111";
 const catalog=(status="UNCHANGED",id="catalog-a")=>({id,competitionSeasonId:season,status});
 const run=(status="succeeded",hours=1,jobName="competition")=>({competitionSeasonId:season,jobName,status,startedAt:new Date(now.getTime()-hours*3600000),finishedAt:new Date(now.getTime()-hours*3600000+1000)});
 it("treats a successful empty snapshot as a legitimate zero",()=>{expect(buildCompetitionTeamIndexes([catalog()],[],[run()],now)[0]).toMatchObject({coverageStatus:"COMPLETE",teamCount:0,playerRegistrationCount:0,teams:[]})});
 it("does not present a never-synced or failed empty snapshot as zero",()=>{
  expect(buildCompetitionTeamIndexes([catalog()],[],[],now)[0]).toMatchObject({coverageStatus:"NOT_SYNCED",teamCount:null,playerRegistrationCount:null});
  expect(buildCompetitionTeamIndexes([catalog()],[],[run("failed")],now)[0]).toMatchObject({coverageStatus:"FAILED",teamCount:null,playerRegistrationCount:null});
 });
 it("preserves the last valid rows for partial, stale, and failed coverage",()=>{
  const rows=[{catalogId:"catalog-a",competitionSeasonId:season,teamId:"team-a",teamName:"Águilas",playerRegistrationCount:2n}];
  expect(buildCompetitionTeamIndexes([catalog("PARTIAL")],rows,[run()],now)[0]).toMatchObject({coverageStatus:"PARTIAL",teamCount:1,playerRegistrationCount:2});
  expect(buildCompetitionTeamIndexes([catalog()],rows,[run("succeeded",25)],now)[0].coverageStatus).toBe("STALE");
  expect(buildCompetitionTeamIndexes([catalog()],rows,[run("failed"),run("succeeded",2)],now)[0]).toMatchObject({coverageStatus:"FAILED",teamCount:1,playerRegistrationCount:2});
 });
 it("isolates competitions, keeps homonyms by ID, counts registrations, and sorts stably",()=>{
  const otherSeason="22222222-2222-4222-8222-222222222222";
  const rows=[
   {catalogId:"catalog-a",competitionSeasonId:season,teamId:"team-z",teamName:"Águilas",playerRegistrationCount:2n},
   {catalogId:"catalog-a",competitionSeasonId:season,teamId:"team-a",teamName:"aguilas",playerRegistrationCount:3n},
   {catalogId:"catalog-b",competitionSeasonId:otherSeason,teamId:"team-b",teamName:"Béticos",playerRegistrationCount:7n},
  ];
  const result=buildCompetitionTeamIndexes([catalog(),{id:"catalog-b",competitionSeasonId:otherSeason,status:"UNCHANGED"}],rows,[run(),{...run(),competitionSeasonId:otherSeason}],now);
  expect(result[0]).toMatchObject({teamCount:2,playerRegistrationCount:5,teams:[{teamId:"team-a"},{teamId:"team-z"}]});
  expect(result[1]).toMatchObject({teamCount:1,playerRegistrationCount:7,teams:[{teamId:"team-b"}]});
 });
 it("uses a bounded three-query read rather than querying per team",async()=>{
  const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("./ingestion-admin.ts",import.meta.url),"utf8"));
  const body=source.slice(source.indexOf("export async function getMonitoredCompetitionTeamIndexes"),source.indexOf("export async function requireIngestionAdmin"));
  expect(body.match(/db\./g)).toHaveLength(3);
  expect(body).not.toMatch(/for\s*\([^)]*team/i);
  expect(body).toContain("::uuid");
 });
 it("keeps the read API protected and the disclosure accessible",async()=>{
  const fs=await import("node:fs/promises");
  const api=await fs.readFile(new URL("../../app/api/admin/ingestion/team-index/route.ts",import.meta.url),"utf8");
  const ui=await fs.readFile(new URL("../../app/app/admin/ingestion/competition-team-index.tsx",import.meta.url),"utf8");
  expect(api).toContain("await requireAdminActor()");
  expect(api).not.toMatch(/enqueue|fetch\(|FAB|rawFabPayload/i);
  expect(ui).toMatch(/aria-expanded=.*aria-controls=/);
  expect(ui).toMatch(/role="alert"/);
  expect(ui).toMatch(/Reintentar/);
  expect(ui).toMatch(/button\.current\?\.focus/);
 });
});
