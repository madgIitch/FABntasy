import { notFound } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/server";
import { AdminError } from "../../../../src/server/ingestion-admin";
import { listRevisions, requireRevisionAdmin } from "../../../../src/server/sports-data-revisions";
import { RevisionForm } from "./revision-form";
import { RevertButton } from "./revert-button";
const dt=new Intl.DateTimeFormat("es-ES",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Madrid"});
export default async function CorrectionsPage(){const{data:{user}}=await(await createClient()).auth.getUser();if(!user)notFound();try{await requireRevisionAdmin(user.id)}catch(error){if(error instanceof AdminError)notFound();throw error}const revisions=await listRevisions();return <main className="app-main admin-page"><header className="workspace-header"><div><p className="eyebrow">Datos deportivos</p><h1>Correcciones</h1><p>Previsualiza cada cambio y su impacto antes de publicarlo.</p></div></header><section className="profile-group"><h2>Nueva revisión</h2><RevisionForm/></section><section className="profile-group"><h2>Historial inmutable</h2><div className="admin-table">{revisions.length?revisions.map(item=><article key={item.id}><strong>{item.targetType} · {item.fieldName}</strong><span>{item.status}</span><small>{dt.format(item.createdAt)} · {item.sourceType} · recálculo {item.recomputationStatus}</small>{item.status==="APPLIED"&&!item.revertsRevisionId?<RevertButton id={item.id}/>:null}</article>):<p>No hay revisiones todavía.</p>}</div></section></main>}
