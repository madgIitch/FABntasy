import { notFound } from "next/navigation";
import { getServerUser } from "../../../../src/lib/supabase/server";
import { AdminError, requireIngestionAdmin } from "../../../../src/server/ingestion-admin";
import { getRolloutAccess } from "../../../../src/server/rollout";
import { RolloutControl } from "./rollout-control";
import { marketV2State } from "../../../../src/server/market-v2";
import { MarketV2Control } from "./market-v2-control";
export default async function RolloutPage() { const user = await getServerUser(); if (!user) notFound(); try { await requireIngestionAdmin(user.id); } catch (error) { if (error instanceof AdminError && error.status === 404) notFound(); throw error; } const [rollout, marketV2] = await Promise.all([getRolloutAccess(), marketV2State()]); return <main className="app-main admin-page"><header className="workspace-header"><div><p className="eyebrow">Operaciones internas</p><h1>Control de acceso</h1></div></header><RolloutControl initialState={rollout.state} initialVersion={rollout.version} available={rollout.available} /><MarketV2Control initialState={marketV2}/></main>; }
