"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "./ui/field";

type Season = { id: string; label: string };
type ErrorBody = { error?: { code?: string }; data?: { id?: string } };

function invitationPath(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.origin !== location.origin || !/^\/liga\/[A-Za-z0-9_-]{22}$/.test(url.pathname)) return null;
    return url.pathname;
  } catch {
    return /^\/liga\/[A-Za-z0-9_-]{22}$/.test(value.trim()) ? value.trim() : null;
  }
}

export function LeagueManagementForm({ mode, seasons = [] }: { mode: "create" | "join"; seasons?: Season[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (mode === "join") {
      const path = invitationPath(link);
      if (!path) { setMessage("Introduce un enlace de invitación válido."); return; }
      router.push(path);
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/fantasy/leagues", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, competitionSeasonId: seasonId }) });
      const body = await response.json().catch(() => null) as ErrorBody | null;
      if (!response.ok) { setMessage(body?.error?.code === "INVALID_INPUT" ? "Revisa el nombre y la competición." : "No se pudo crear la liga."); return; }
      if (body?.data?.id) await fetch("/api/fantasy/leagues/active", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leagueId: body.data.id }) });
      router.push(body?.data?.id ? `/app/ligas/${body.data.id}` : "/app/perfil/ligas"); router.refresh();
    } catch { setMessage("Sin conexión. Vuelve a intentarlo."); }
    finally { setPending(false); }
  }
  return <form className="profile-form" onSubmit={submit} aria-busy={pending}>
    {mode === "create" ? <><Field label="Nombre de la liga" value={name} minLength={3} maxLength={60} required onChange={event => setName(event.target.value)} /><label className="ui-field"><span>Competición</span><select value={seasonId} required onChange={event => setSeasonId(event.target.value)}>{seasons.map(season => <option key={season.id} value={season.id}>{season.label}</option>)}</select></label></> : <Field label="Enlace de invitación" type="url" value={link} required placeholder="https://canastio.app/liga/…" onChange={event => setLink(event.target.value)} />}
    <div className="profile-form-actions"><button className="primary-action" type="submit" disabled={pending}>{pending ? "Guardando…" : mode === "create" ? "Crear liga" : "Abrir invitación"}</button></div>
    {message ? <p className="form-message error" role="alert">{message}</p> : null}
  </form>;
}
