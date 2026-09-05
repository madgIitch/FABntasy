import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (items) => {
      items.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  } });
  const { data: { user } } = await supabase.auth.getUser();
  const privateRoute = request.nextUrl.pathname === "/app" || request.nextUrl.pathname.startsWith("/app/");
  if (privateRoute && !user) {
    const loginUrl = request.nextUrl.clone(); loginUrl.pathname = "/login"; loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }
  return response;
}
