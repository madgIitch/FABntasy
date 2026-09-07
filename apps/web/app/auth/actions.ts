"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../src/lib/supabase/server";
import { authDebug, authDebugError, newAuthOperation } from "./auth-debug";
import { authErrorLog, registrationErrorMessage } from "./auth-errors";
import { passwordResetRedirect } from "./safe-redirect";

export type AuthState = { status: "idle" | "error" | "success"; message: string; values?: { email?: string; username?: string } };

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
const normalizeUsername = (value: FormDataEntryValue | null) => String(value ?? "").trim().toLowerCase();

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@") || password.length < 8) return null;
  return { email, password };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const operation = newAuthOperation("login");
  const values = credentials(formData);
  if (!values) {
    authDebug(operation, "validation_failed");
    return { status: "error", message: "Revisa el correo y usa al menos 8 caracteres." };
  }
  authDebug(operation, "supabase_request_started");
  const { error } = await (await createClient()).auth.signInWithPassword(values);
  if (error) {
    authDebugError(operation, "supabase_request_failed", authErrorLog(error));
    return { status: "error", message: "No pudimos iniciar sesión. Revisa tus datos o confirma tu correo." };
  }
  authDebug(operation, "completed");
  redirect("/app");
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const operation = newAuthOperation("signup");
  const values = credentials(formData);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const username = normalizeUsername(formData.get("username"));
  const safeValues = { email, username };
  if (!values) {
    authDebug(operation, "validation_failed");
    return { status: "error", message: "Introduce un correo válido y una contraseña de 8 caracteres.", values: safeValues };
  }
  if (!USERNAME_PATTERN.test(username)) {
    authDebug(operation, "validation_failed", { reason: "invalid_username" });
    return { status: "error", message: "El usuario debe tener entre 3 y 24 letras, números o guiones bajos.", values: safeValues };
  }
  const origin = (await headers()).get("origin");
  authDebug(operation, "supabase_request_started", { redirectConfigured: Boolean(origin) });
  const { error } = await (await createClient()).auth.signUp({ ...values, options: { emailRedirectTo: origin ? `${origin}/auth/callback` : undefined, data: { username } } });
  if (error) {
    authDebugError(operation, "supabase_request_failed", authErrorLog(error));
    if (/username|database error saving new user/i.test(error.message)) return { status: "error", message: "Ese nombre de usuario ya está ocupado. Prueba con otro.", values: safeValues };
    return { status: "error", message: registrationErrorMessage(error), values: safeValues };
  }
  authDebug(operation, "completed", { confirmationRequired: true });
  return { status: "success", message: "Revisa tu correo para confirmar la cuenta." };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const operation = newAuthOperation("password_reset_request");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    authDebug(operation, "validation_failed");
    return { status: "error", message: "Introduce un correo válido." };
  }
  const origin = (await headers()).get("origin");
  const redirectTo = passwordResetRedirect(process.env.NEXT_PUBLIC_SITE_URL ?? origin);
  authDebug(operation, "supabase_request_started", { redirectConfigured: Boolean(redirectTo) });
  const { error } = await (await createClient()).auth.resetPasswordForEmail(email, { redirectTo });
  if (error) authDebugError(operation, "supabase_request_failed", authErrorLog(error));
  else authDebug(operation, "completed");
  return { status: "success", message: "Si existe una cuenta, recibirás un enlace para recuperar el acceso." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const operation = newAuthOperation("password_update");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirm") ?? "");
  if (password.length < 8 || password !== confirmation) {
    authDebug(operation, "validation_failed", { reason: password.length < 8 ? "password_too_short" : "password_mismatch" });
    if (password.length < 8) return { status: "error", message: "La contraseña debe tener al menos 8 caracteres." };
    return { status: "error", message: "Las contraseñas no coinciden." };
  }
  const supabase = await createClient();
  authDebug(operation, "session_check_started");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    authDebugError(operation, "session_missing", { status: 401 });
    return { status: "error", message: "El enlace ha caducado o no es válido. Solicita uno nuevo." };
  }
  authDebug(operation, "supabase_request_started");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    authDebugError(operation, "supabase_request_failed", authErrorLog(error));
    return { status: "error", message: "El enlace ha caducado o no es válido. Solicita uno nuevo." };
  }
  authDebug(operation, "completed");
  redirect("/app");
}

export async function logout() {
  const operation = newAuthOperation("logout");
  authDebug(operation, "supabase_request_started");
  await (await createClient()).auth.signOut();
  authDebug(operation, "completed");
  redirect("/login");
}
