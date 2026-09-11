import { notFound } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/server";
import { AdminError, getIngestionDashboard, listRawPayloads, requireIngestionAdmin } from "../../../../src/server/ingestion-admin";
import { AdminRefresh } from "./admin-refresh";
import { JobForm } from "./job-form";
import { RawViewer } from "./raw-viewer";
const dt=new Intl.DateTimeFormat("es-ES",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Madrid"});
type Params={status?:string;type?:string;competitionSeasonId?:string};
export default async function IngestionAdminPage({searchParams}:{searchParams:Promise<Params>}){
 const {data:{user}}=await(await createClient()).auth.getUser();if(!user)notFound();let actor:string;try{actor=await requireIngestionAdmin(user.id)}catch(error){if(error instanceof AdminError&&error.status===404)notFound();throw error}
 const filters=await searchParams,[data,raw]=await Promise.all([getIngestionDashboard(actor,filters),listRawPayloads()]);const active=data.jobs.some(job=>job.status==="QUEUED"||job.status==="RUNNING");
 return <main className="app-main admin-page"><AdminRefresh active={active}/><header className="workspace-header"><div><p className="eyebrow">Operaciones</p><h1>Ingesta FAB</h1></div><span className={`health health-${data.health.toLowerCase()}`}>{data.health}</span></header>
 <section className="admin-summary"><div><small>Último heartbeat</small><strong>{data.heartbeat?dt.format(data.heartbeat.seenAt):"Sin señal"}</strong></div><div><small>Último ciclo correcto</small><strong>{data.lastSuccess?.finishedAt?dt.format(data.lastSuccess.finishedAt):"Sin datos"}</strong></div><div><small>Trabajos activos</small><strong>{data.jobs.filter(job=>["QUEUED","RUNNING"].includes(job.status)).length}</strong></div></section>
 <section className="profile-group"><h2>Relanzar ingesta</h2><JobForm/></section>
 <section className="profile-group"><h2>Trabajos recientes</h2><form className="admin-filters"><select name="status" defaultValue={filters.status??""}><option value="">Todos los estados</option>{["QUEUED","RUNNING","SUCCEEDED","FAILED","CANCELLED"].map(value=><option key={value}>{value}</option>)}</select><select name="type" defaultValue={filters.type??""}><option value="">Todos los tipos</option>{["GAME","ROUND","COMPETITION"].map(value=><option key={value}>{value}</option>)}</select><input name="competitionSeasonId" defaultValue={filters.competitionSeasonId??""} placeholder="UUID competición"/><button>Filtrar</button></form><div className="admin-table">{data.jobs.length?data.jobs.map(job=><article key={job.id}><strong>{job.type} · {job.targetKey}</strong><span>{job.effectiveStatus}</span><small>{dt.format(job.requestedAt)} · {job.errorCode??"Sin error"}</small></article>):<p>No hay trabajos para estos filtros.</p>}</div></section>
 <section className="profile-group"><h2>Ejecuciones</h2><div className="admin-table">{data.runs.map(run=><article key={run.id}><strong>{run.jobName}</strong><span>{run.status}</span><small>{dt.format(run.startedAt)} · {run.errorCategory??"Sin error"}</small></article>)}</div></section>
 <section className="profile-group"><h2>Payloads RAW recientes</h2><div className="admin-table">{raw.map(item=><article key={item.id}><strong>{item.entityType} · {item.externalId??"sin ID"}</strong><span>HTTP {item.httpStatus}</span><small>{dt.format(item.retrievedAt)} · {item.endpoint}</small><RawViewer id={item.id}/></article>)}</div></section></main>
}
