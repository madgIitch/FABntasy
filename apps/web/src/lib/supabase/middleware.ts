import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";
import { consumeRateLimit, rateLimitClass } from "../../server/security";

const MUTATION = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSP = ["default-src 'self'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'", "img-src 'self' data: blob: https://*.supabase.co", "font-src 'self'", "style-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline'", "connect-src 'self' https://*.supabase.co wss://*.supabase.co", "worker-src 'self' blob:", "manifest-src 'self'"].join("; ");

function secure(response: NextResponse) {
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return response;
}
export async function updateSession(request: NextRequest) {
  const inviteNavigation = request.nextUrl.pathname.startsWith("/liga/") || ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/registro") && request.nextUrl.searchParams.get("next")?.startsWith("/liga/"));
  if (MUTATION.has(request.method)) {
    const origin = request.headers.get("origin");
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== request.nextUrl.origin)) {
      return secure(NextResponse.json({ error: { code: "INVALID_ORIGIN" } }, { status: 403 }));
    }
  }
  const sessionCookie = request.cookies.getAll().find(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const trustedIdentity = sessionCookie?.value || forwarded || "anonymous";
  const rate = consumeRateLimit(rateLimitClass(request.nextUrl.pathname, request.method), trustedIdentity);
  if (!rate.allowed) {
    const limited = NextResponse.json({ error: { code: "RATE_LIMITED" } }, { status: 429 });
    limited.headers.set("Retry-After", String(rate.retryAfter));
    return secure(limited);
  }
  let response = NextResponse.next({ request });
  const privateRoute = request.nextUrl.pathname === "/app" || request.nextUrl.pathname.startsWith("/app/");
  // Public, anonymous assets and pages do not need an auth round-trip. Besides
  // reducing latency, this keeps public PWA contract tests independent of Supabase.
  if (!privateRoute && !sessionCookie) {
    const publicResponse = secure(response);
    if (inviteNavigation) publicResponse.headers.set("Referrer-Policy", "no-referrer");
    return publicResponse;
  }
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (items) => {
      items.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      items.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" }));
    },
  } });
  const { data: { user } } = await supabase.auth.getUser();
  if (privateRoute && !user) {
    const loginUrl = request.nextUrl.clone(); loginUrl.pathname = "/login"; loginUrl.search = "";
    return secure(NextResponse.redirect(loginUrl));
  }
  const finalResponse = secure(response);
  if (inviteNavigation) finalResponse.headers.set("Referrer-Policy", "no-referrer");
  return finalResponse;
}
