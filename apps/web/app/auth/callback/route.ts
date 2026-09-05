import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../src/lib/supabase/server";
import { safeNextPath } from "../safe-redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
}
