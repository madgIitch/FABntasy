import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();
  return createServerClient(url, publishableKey, { cookies: {
    getAll: () => cookieStore.getAll(),
    setAll: (items) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* middleware refreshes */ } },
  } });
}
