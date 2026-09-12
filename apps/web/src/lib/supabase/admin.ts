import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_ADMIN_UNAVAILABLE");
  return createClient(getSupabaseEnv().url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
