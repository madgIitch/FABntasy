import { createClient } from "../lib/supabase/server";
import { AdminError, requireIngestionAdmin } from "./ingestion-admin";
export async function requireAdminActor() { const { data: { user } } = await (await createClient()).auth.getUser(); if (!user) throw new AdminError("NOT_FOUND",404); return requireIngestionAdmin(user.id); }
export function adminResponse(data: unknown, status=200){return Response.json({schemaVersion:"ingestion-admin.v1",data},{status})}
export function adminFailure(error:unknown){const known=error instanceof AdminError;return Response.json({error:known?error.code:"INTERNAL_ERROR"},{status:known?error.status:500})}
export function assertAdminOrigin(request:Request){const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)throw new AdminError("INVALID_ORIGIN",403)}
