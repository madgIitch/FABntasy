import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";
const root=resolve(process.cwd(),"../..");
const schema=readFileSync(resolve(root,"prisma/schema.prisma"),"utf8");
const migration=readFileSync(resolve(root,"prisma/migrations/20260911000300_data_corrections_audit/migration.sql"),"utf8");
const repository=readFileSync(resolve(root,"services/fab_ingestor/fab_ingestor/repository.py"),"utf8");
describe("sports data revision persistence",()=>{
 it("stores immutable snapshots, fingerprints, impact and reversal links",()=>{for(const value of ["model SportsDataRevision","beforeSnapshot","afterSnapshot","expectedFingerprint","revertsRevisionId","recomputationStatus"])expect(schema).toContain(value)});
 it("constrains targets, sources and lifecycle states in PostgreSQL",()=>{expect(migration).toContain("sports_data_revisions_target");expect(migration).toContain("SOURCE_CORRECTION");expect(migration).toContain("MANUAL_OVERRIDE");expect(migration).toContain("PROPOSED");expect(migration).toContain("APPLIED")});
 it("prevents ingestion from silently overwriting applied manual fields",()=>{expect(repository).toContain("source_type = 'MANUAL_OVERRIDE'");expect(repository).toContain("status = 'APPLIED'");expect(repository).toContain("protected_fields")});
});
