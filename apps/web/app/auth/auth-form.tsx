"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "./actions";
const initialAuthState: AuthState = { status: "idle", message: "" };

type Props = { mode: "login" | "register" | "reset" | "update"; action: (state: AuthState, data: FormData) => Promise<AuthState>; initialMessage?: string };
const copy = {
  login: ["Vuelve a la cancha", "Entra para gestionar tu equipo.", "Entrar"],
  register: ["Crea tu vestuario", "Una cuenta. Tu equipo toda la temporada.", "Crear cuenta"],
  reset: ["Recupera el acceso", "Te enviaremos un enlace seguro.", "Enviar enlace"],
  update: ["Nueva contraseña", "Elige una clave de al menos 8 caracteres.", "Guardar contraseña"],
} as const;

export function AuthForm({ mode, action, initialMessage }: Props) {
  const actionInitialState: AuthState = initialMessage ? { status: "error", message: initialMessage } : initialAuthState;
  const [state, formAction, pending] = useActionState(action, actionInitialState);
  const [title, detail, button] = copy[mode];
  const needsEmail = mode !== "update";
  const needsPassword = mode === "login" || mode === "register" || mode === "update";
  return <main className="auth-page">
    <Link className="wordmark" href="/">Canastio</Link>
    <section className="auth-panel">
      <p className="eyebrow">Cuenta Canastio</p><h1>{title}</h1><p>{detail}</p>
      <form action={formAction}>
        {needsEmail && <label>Correo electrónico<input name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required /></label>}
        {mode === "register" && <label>Nombre de usuario<span className="field-hint">Entre 3 y 24 caracteres: letras, números o _</span><div className="username-field"><span aria-hidden="true">@</span><input name="username" type="text" autoComplete="username" defaultValue={state.values?.username} minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" required /></div></label>}
        {needsPassword && <label>Contraseña<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></label>}
        {mode === "update" && <label>Repite la contraseña<input name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} required /></label>}
        <button className="primary-action" disabled={pending}>{pending ? "Un momento…" : button}<span aria-hidden="true">→</span></button>
        {state.message && <p className={`form-message ${state.status}`} role="status">{state.message}</p>}
      </form>
      {mode === "login" && <div className="auth-links"><Link href="/recuperar-clave">He olvidado mi contraseña</Link><Link href="/registro">Crear cuenta</Link></div>}
      {mode === "register" && <div className="auth-links"><span>¿Ya tienes cuenta?</span><Link href="/login">Iniciar sesión</Link></div>}
      {mode === "update" && <div className="auth-links"><span>¿Necesitas otro enlace?</span><Link href="/recuperar-clave">Solicitar uno nuevo</Link></div>}
    </section>
  </main>;
}
