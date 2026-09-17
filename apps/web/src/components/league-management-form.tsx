"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "./ui/field";

type Season = { id: string; label: string };
type ErrorBody = { error?: { code?: string } };
const messages: Record<string, string> = { INVALID_CREDENTIALS: "El código o la contraseña no son correctos.", LEAGUE_FULL: "La liga ya tiene 20 managers.", ALREADY_MEMBER: "Ya perteneces a esta liga.", RATE_LIMITED: "Demasiados intentos. Espera unos minutos.", INVALID_INPUT: "Revisa los datos introducidos." };

export function LeagueManagementForm({ mode, seasons = [] }: { mode: "create" | "join"; seasons?: Season[] }) {
  const router = useRouter();
  const [name, setName] = useState(""), [seasonId, setSeasonId] = useState(seasons[0]?.id ?? ""), [code, setCode] = useState(""), [password, setPassword] = useState(""), [pending, setPending] = useState(false), [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const create = mode === "create";
    const response = await fetch(create ? "/api/fantasy/leagues" : "/api/fantasy/leagues/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(create ? { name, competitionSeasonId: seasonId, password } : { code, password }) });
    const body = await response.json().catch(() => null) as (ErrorBody & { data?: { id?: string } }) | null;
    if (!response.ok) { setPending(false); setMessage(messages[body?.error?.code ?? ""] ?? "No se pudo completar la operación."); return; }
    if (body?.data?.id) await fetch("/api/fantasy/leagues/active", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leagueId: body.data.id }) });
    router.push("/app/perfil/ligas"); router.refresh();
  }
  return <form className="profile-form" onSubmit={submit} aria-busy={pending}>
    {mode === "create" ? <><Field label="Nombre de la liga" value={name} minLength={3} maxLength={60} required onChange={(event) => setName(event.target.value)} /><label className="ui-field"><span>Competición</span><select value={seasonId} required onChange={(event) => setSeasonId(event.target.value)}>{seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}</select></label></> : <Field label="Código de liga" value={code} required autoCapitalize="characters" placeholder="CNST-XXXXXX" onChange={(event) => setCode(event.target.value.toUpperCase())} />}
    <Field label="Contraseña" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} minLength={6} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} />
    <div className="profile-form-actions"><button className="primary-action" type="submit" disabled={pending}>{pending ? "Guardando…" : mode === "create" ? "Crear liga" : "Entrar en la liga"}</button></div>
    {message ? <p className="form-message error" role="alert">{message}</p> : null}
  </form>;
}
