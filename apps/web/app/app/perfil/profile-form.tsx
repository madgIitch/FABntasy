"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveProfile, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = { status: "idle", message: "" };

export function ProfileForm({ username, displayName }: { username: string | null; displayName: string | null }) {
  const [state, action, pending] = useActionState(saveProfile, initialState);
  return <form className="profile-form" action={action}>
    <label>Foto de perfil<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" /><span className="field-hint">JPG, PNG o WebP · máximo 2 MB</span></label>
    <label>Nombre de usuario<div className="username-field"><span aria-hidden="true">@</span><input name="username" defaultValue={username ?? ""} autoComplete="username" minLength={3} maxLength={24} pattern="[a-z0-9_]+" required /></div></label>
    <label>Nombre visible <span className="field-hint">Opcional</span><input name="displayName" defaultValue={displayName ?? ""} maxLength={60} autoComplete="name" /></label>
    {state.message && <p className="form-message error" role="alert">{state.message}</p>}
    <div className="profile-form-actions"><Link href="/app/perfil">Cancelar</Link><button className="primary-action" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</button></div>
  </form>;
}
