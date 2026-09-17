"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutControl } from "../../app/app/account-controls";
import styles from "./league-hub.module.css";
import gateStyles from "./league-onboarding.module.css";
import { Field } from "./ui/field";
import { Icon } from "./ui/icon";
import { LeagueDetailActions } from "./league-detail";

type Season = { id: string; label: string };
type PreviewLeague = { id: string; name: string; leagueCode: string; isOwner: boolean; memberCount: number };
type Mode = "create" | "join";
async function body(response: Response) { const type = response.headers.get("content-type") ?? ""; return type.includes("application/json") ? response.json() as Promise<{ error?: { code?: string } }> : null; }
const errorMessage = (code: string | undefined, fallback: string) => code === "INVALID_INPUT" ? "No hemos podido completar tu perfil. Recarga la página e inténtalo de nuevo." : code ?? fallback;

export function LeagueOnboarding({ seasons, preview = false, previewLeagues = [] }: { seasons: Season[]; preview?: boolean; previewLeagues?: PreviewLeague[] }) {
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const [createPassword, setCreatePassword] = useState("");
  const [code, setCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function choose(nextMode: Mode) { setMode(nextMode); setMessage(""); }
  async function create() {
    if (name.trim().length < 3) { setMessage("El nombre de la liga debe tener al menos 3 caracteres."); return; }
    if (!seasonId) { setMessage("Selecciona una competición."); return; }
    if (createPassword.length < 6) { setMessage("La contraseña debe tener al menos 6 caracteres."); return; }
    setPending(true); setMessage("");
    const response = await fetch("/api/fantasy/leagues", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, competitionSeasonId: seasonId, password: createPassword }) });
    const result = await body(response);
    if (!response.ok) { setPending(false); setMessage(errorMessage(result?.error?.code, "No se pudo crear la liga")); return; }
    location.assign("/app");
  }
  async function join() {
    if (!code.trim()) { setMessage("Introduce el código de la liga."); return; }
    if (!joinPassword) { setMessage("Introduce la contraseña de la liga."); return; }
    setPending(true); setMessage("");
    const response = await fetch("/api/fantasy/leagues/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, password: joinPassword }) });
    const result = await body(response);
    if (!response.ok) { setPending(false); setMessage(errorMessage(result?.error?.code, "Código o contraseña incorrectos")); return; }
    location.assign("/app");
  }

  return <main className={`${styles.page} ${styles.onboarding} ${gateStyles.gated}`}>
    <div className={gateStyles.topbar}><Link className="wordmark" href="/" aria-label="Canastio, inicio">Canastio</Link><LogoutControl /></div>
    <header className={gateStyles.intro}><div><p>{preview ? "Acceso anticipado" : "Último paso"}</p><h1>{preview && previewLeagues.length ? "Tus ligas ya están preparadas" : preview ? "Tu liga empieza aquí" : "Configura tu primera liga"}</h1><span>{preview && previewLeagues.length ? "Puedes invitar a tus grupos o apuntarte a más ligas mientras terminamos de abrir Canastio." : preview ? "Crea una liga o entra con el código de tu grupo. Te avisaremos cuando se abra la cancha completa." : "Elige cómo quieres empezar. Podrás gestionar más ligas después."}</span></div><div className={gateStyles.courtMark} aria-hidden="true"><i /></div></header>
    {previewLeagues.map((league, index) => <div key={league.id}><section className={`${styles.actions} ${gateStyles.singleAction} preview-league-summary`} aria-labelledby={`preview-league-title-${index}`}><p className={gateStyles.formLabel}>TU LIGA</p><h2 id={`preview-league-title-${index}`}>{league.name}</h2><p>{league.memberCount} {league.memberCount === 1 ? "manager" : "managers"}</p><strong>● Plaza confirmada</strong></section><LeagueDetailActions leagueId={league.id} leagueCode={league.leagueCode} isOwner={league.isOwner} /></div>)}
    {preview && previewLeagues.length ? <h2>Añadir otra liga</h2> : null}
    <fieldset className={gateStyles.choice}>
      <legend>Cómo quieres empezar</legend>
      <label onClick={() => choose("create")}><input type="radio" name="league-mode" value="create" checked={mode === "create"} onChange={() => choose("create")} /><Icon name="league" /><span><strong>Crear una liga</strong><small>Organiza una competición</small></span></label>
      <label onClick={() => choose("join")}><input type="radio" name="league-mode" value="join" checked={mode === "join"} onChange={() => choose("join")} /><Icon name="user" /><span><strong>Tengo un código</strong><small>Únete a tus amigos</small></span></label>
    </fieldset>
    <section key={mode} className={`${styles.actions} ${gateStyles.singleAction}`} aria-live="polite">
      {mode === "create" ? <form onSubmit={(event) => { event.preventDefault(); void create(); }}><p className={gateStyles.formLabel}>CREAR</p><h2>Nueva liga</h2><Field label="Nombre de la liga" placeholder="Ej. Los del viernes" value={name} onChange={(event) => setName(event.target.value)} /><label className="ui-field"><span>Competición</span><select aria-label="Competición" value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>{seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}</select></label><Field label="Contraseña" type="password" autoComplete="new-password" minLength={6} maxLength={72} placeholder="Mínimo 6 caracteres" value={createPassword} onChange={(event) => setCreatePassword(event.target.value)} /><button type="submit" disabled={pending}>{pending ? "Creando…" : "Crear liga"}<span>→</span></button></form>
        : <form onSubmit={(event) => { event.preventDefault(); void join(); }}><p className={gateStyles.formLabel}>UNIRME</p><h2>Entrar en una liga</h2><Field label="Código de liga" autoCapitalize="characters" placeholder="CNST-XXXXXX" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /><Field label="Contraseña" type="password" autoComplete="current-password" placeholder="Contraseña de la liga" value={joinPassword} onChange={(event) => setJoinPassword(event.target.value)} /><button type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar en la liga"}<span>→</span></button></form>}
    </section>
    {message && <p role="alert" className={styles.message}>{message}</p>}
    <p className={gateStyles.note}>{preview && previewLeagues.length ? "Todo listo. Puedes seguir añadiendo ligas y te avisaremos cuando se abra la cancha." : preview ? "Tu cuenta y tu liga quedarán preparadas. El resto de Canastio sigue en pruebas." : "Al completar este paso se activará el resto de Canastio."}</p>
  </main>;
}
