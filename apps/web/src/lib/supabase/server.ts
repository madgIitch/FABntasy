import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseEnv } from "./env";
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();
  return createServerClient(url, publishableKey, { cookies: {
    getAll: () => cookieStore.getAll(),
    setAll: (items) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" })); } catch { /* middleware refreshes */ } },
  } });
}

/** Request-scoped session lookup shared by layouts, pages and server services. */
export const getServerUser = cache(async () => {
  const { data: { user } } = await (await createClient()).auth.getUser();
  return user;
});
