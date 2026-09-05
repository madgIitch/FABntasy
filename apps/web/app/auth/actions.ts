"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../src/lib/supabase/server";

export type AuthState = { status: "idle" | "error" | "success"; message: string };

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@") || password.length < 8) return null;
  return { email, password };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const values = credentials(formData);
  if (!values) return { status: "error", message: "Revisa el correo y usa al menos 8 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(values);
  if (error) return { status: "error", message: "No pudimos iniciar sesión. Revisa tus datos o confirma tu correo." };
  redirect("/app");
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const values = credentials(formData);
  if (!values) return { status: "error", message: "Introduce un correo válido y una contraseña de 8 caracteres." };
  const origin = (await headers()).get("origin");
  const { error } = await (await createClient()).auth.signUp({ ...values, options: { emailRedirectTo: origin ? `${origin}/auth/callback` : undefined } });
  if (error) return { status: "error", message: "No se pudo completar el registro. Espera un momento e inténtalo de nuevo." };
  return { status: "success", message: "Revisa tu correo para confirmar la cuenta." };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { status: "error", message: "Introduce un correo válido." };
  const origin = (await headers()).get("origin");
  await (await createClient()).auth.resetPasswordForEmail(email, { redirectTo: origin ? `${origin}/auth/callback?next=/actualizar-clave` : undefined });
  return { status: "success", message: "Si existe una cuenta, recibirás un enlace para recuperar el acceso." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { status: "error", message: "La contraseña debe tener al menos 8 caracteres." };
  const { error } = await (await createClient()).auth.updateUser({ password });
  if (error) return { status: "error", message: "El enlace ha caducado o no es válido. Solicita uno nuevo." };
  redirect("/app");
}

export async function logout() {
  await (await createClient()).auth.signOut();
  redirect("/login");
}
