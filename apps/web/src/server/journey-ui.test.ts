import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root=resolve(process.cwd(),"../..");
const service=readFileSync(resolve(root,"apps/web/src/server/journey.ts"),"utf8");
const component=readFileSync(resolve(root,"apps/web/src/components/journey-live.tsx"),"utf8");
const css=readFileSync(resolve(root,"apps/web/src/components/journey-live.module.css"),"utf8").replace(/\s+/g,"");

describe("live journey UI contract",()=>{
 it("queries only starter slots and never manufactures a missing score",()=>{expect(service).toContain('where:{role:"STARTER"}');expect(service).toContain('totalPoints:roundScore?.points?.toString()??null');expect(service).not.toContain('role:"SUBSTITUTE"')});
 it("renders every player state and an accessible score evolution",()=>{for(const state of ["UPCOMING","LIVE","FINAL","DNP","PENDING"])expect(service).toContain(state);expect(component).toContain('role="img"');expect(component).toContain("aria-label={`Evolución acumulada")});
 it("keeps mobile interaction targets and single-column layouts",()=>{expect(css).toContain("min-height:3.2rem");expect(css).toContain("@media(max-width:700px)");expect(css).toContain(".chart{grid-template-columns:1fr")});
});
