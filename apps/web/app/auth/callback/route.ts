import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../src/lib/supabase/server";
import { authDebug, authDebugError, newAuthOperation } from "../auth-debug";
import { safeNextPath, validEmailOtpType } from "../safe-redirect";

export async function GET(request: NextRequest) {
  const operation = newAuthOperation("email_callback");
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const cookieNext = request.cookies.get("league_invite_next")?.value;
  const next = safeNextPath(request.nextUrl.searchParams.get("next") ?? (type === "recovery" ? "/actualizar-clave" : cookieNext ?? null));
  const supabase = await createClient();
  let error: Error | null = null;
  authDebug(operation, "verification_started", {
    linkKind: code ? "pkce_code" : tokenHash ? "token_hash" : "missing_token",
    otpType: type,
  });
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && validEmailOtpType(type)) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    error = new Error("invalid_auth_link");
  }
  const recoveryFlow = type === "recovery" || next === "/actualizar-clave";
  if (error) {
    const authError = error as Error & { code?: string; status?: number };
    authDebugError(operation, "verification_failed", {
      code: authError.code ?? authError.message,
      status: authError.status ?? null,
      recoveryFlow,
    });
  } else {
    authDebug(operation, "completed", { recoveryFlow, destination: next.startsWith("/liga/") ? "league_invite" : next });
  }
  const destination = new URL(error ? (recoveryFlow ? "/recuperar-clave" : "/login") : next, request.url);
  destination.search = error ? "?error=invalid_link" : "";
  const response = NextResponse.redirect(destination);
  if (!error && cookieNext) response.cookies.delete("league_invite_next");
  return response;
}
