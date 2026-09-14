import { describe, expect, it } from "vitest";
import { boundedRaw, classifyIngestionError, parseJob, parseMonitoringUpdate, redactRaw } from "./ingestion-admin";
describe("ingestion admin contracts",()=>{
 it("redacts secrets recursively and case-insensitively",()=>{expect(redactRaw({key:"x",nested:{ID_DISPOSITIVO:"y",players:[{token:"z",name:"Ana"}]}})).toEqual({key:"[REDACTED]",nested:{ID_DISPOSITIVO:"[REDACTED]",players:[{token:"[REDACTED]",name:"Ana"}]}})});
 it("bounds raw output",()=>{expect(boundedRaw({value:"x".repeat(300000)}).truncated).toBe(true)});
 it("validates normalized job targets",()=>{expect(parseJob({type:"GAME",target:{gameId:"abc-123"}})).toMatchObject({targetKey:"gameId:abc-123"});expect(parseJob({type:"ROUND",target:{categoryId:"cat-1",roundNumber:4}})).toMatchObject({targetKey:"categoryId:cat-1:round:4"});expect(()=>parseJob({type:"GAME",target:{gameId:"https://bad"}})).toThrow("INVALID_TARGET")});
 it("classifies safe error families",()=>{expect(classifyIngestionError("FAB_CREDENTIAL_EXPIRED")).toBe("FAB_AUTH");expect(classifyIngestionError("DATABASE_ERROR")).toBe("DATABASE");expect(classifyIngestionError("BOX_SCORE_INCOMPLETE")).toBe("NORMALIZATION")});
 it("validates catalog monitoring mutations",()=>{const id="960959d8-60ba-4bd4-92d0-a14a9aea1ace";expect(parseMonitoringUpdate(id,true)).toEqual({catalogId:id,monitored:true});expect(()=>parseMonitoringUpdate("10468",true)).toThrow("INVALID_TARGET");expect(()=>parseMonitoringUpdate(id,"true")).toThrow("INVALID_TARGET")});
});
