import type { EmailOtpType } from "@supabase/supabase-js";

const emailOtpTypes = new Set<EmailOtpType>(["email", "signup", "invite", "magiclink", "recovery", "email_change"]);

export function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/app";
}

export function validEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && emailOtpTypes.has(value as EmailOtpType);
}

export function passwordResetRedirect(siteUrl: string | null) {
  if (!siteUrl) return undefined;
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return `${url.origin}/auth/callback?next=/actualizar-clave`;
  } catch {
    return undefined;
  }
}
