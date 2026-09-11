import { describe,expect,it } from "vitest";
import { GAME_FIELDS,STAT_FIELDS,RevisionError,parseRevisionInput } from "./sports-data-revisions";
const base={targetType:"GAME",targetId:"00000000-0000-4000-8000-000000000001",sourceType:"MANUAL_OVERRIDE",fieldName:"homeScore",value:"71",internalReason:"Acta oficial corregida",idempotencyKey:"revision:test:0001"};
describe("sports data revisions",()=>{
 it("normalizes an allowed integer without accepting actor input",()=>expect(parseRevisionInput({...base,actorProfileId:"attacker"} as typeof base)).toMatchObject({value:71,fieldName:"homeScore"}));
 it("rejects identifiers and derived fields",()=>{for(const fieldName of ["id","gameId","normalizedFantasyPoints","FAB_KEY"])expect(()=>parseRevisionInput({...base,fieldName})).toThrowError(RevisionError)});
 it("requires a meaningful manual reason",()=>expect(()=>parseRevisionInput({...base,internalReason:"x"})).toThrowError("REASON_REQUIRED"));
 it("distinguishes booleans, dates and nullable values",()=>{expect(parseRevisionInput({...base,fieldName:"hasStatistics",value:"false"}).value).toBe(false);expect(parseRevisionInput({...base,fieldName:"scheduledAt",value:"2026-10-03T17:00:00+02:00"}).value).toBe("2026-10-03T15:00:00.000Z");expect(parseRevisionInput({...base,value:""}).value).toBeNull()});
 it("keeps the allowlists intentionally narrow",()=>{expect(GAME_FIELDS).toHaveLength(6);expect(STAT_FIELDS).not.toContain("playerRegistrationId")});
});
