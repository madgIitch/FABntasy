"use client";

import { useState } from "react";
import { LogoutControl } from "../../app/app/account-controls";
import styles from "./league-hub.module.css";
import gateStyles from "./league-onboarding.module.css";

import { Field } from "./ui/field";

type Season = { id: string; label: string };
async function body(response: Response) { const type = response.headers.get("content-type") ?? ""; return type.includes("application/json") ? response.json() as Promise<{ error?: { code?: string } }> : null; }

export function LeagueOnboarding({ seasons }: { seasons: Season[] }) {
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const [createPassword, setCreatePassword] = useState("");
  const [code, setCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function create() {
    setPending(true); setMessage("");
    const response = await fetch("/api/fantasy/leagues", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, competitionSeasonId: seasonId, password: createPassword }) });
    const result = await body(response);
    if (!response.ok) { setPending(false); setMessage(result?.error?.code ?? "No se pudo crear la liga"); return; }
    location.assign("/app");
  }

  async function join() {
    setPending(true); setMessage("");
    const response = await fetch("/api/fantasy/leagues/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, password: joinPassword }) });
    const result = await body(response);
    if (!response.ok) { setPending(false); setMessage(result?.error?.code ?? "Código o contraseña incorrectos"); return; }
    location.assign("/app");
  }

  return <main className={`${styles.page} ${styles.onboarding} ${gateStyles.gated}`}>
    <header><p>Tu primera liga</p><h1>Entra en juego</h1><span>Para continuar en Canastio, crea una liga o únete con el código de tus amigos.</span></header>
    <section className={styles.actions} aria-label="Empezar en Canastio"><div><span className={styles.step}>01</span><h2>Crear una liga</h2><Field label="Nombre de la liga" placeholder="Nombre de la liga" value={name} onChange={(event) => setName(event.target.value)} /><label className="ui-field"><span>Competición</span><select aria-label="Competición" value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>{seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}</select></label><Field label="Contraseña de la nueva liga" type="password" autoComplete="new-password" minLength={6} maxLength={72} placeholder="Contraseña · mínimo 6 caracteres" value={createPassword} onChange={(event) => setCreatePassword(event.target.value)} /><button disabled={pending || name.trim().length < 3 || !seasonId || createPassword.length < 6} onClick={() => void create()}>Crear liga <span>→</span></button></div>
      <div><span className={styles.step}>02</span><h2>Unirme a una liga</h2><Field label="Código de liga" autoCapitalize="characters" placeholder="CNST-XXXXXX" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /><Field label="Contraseña de liga" type="password" autoComplete="current-password" placeholder="Contraseña" value={joinPassword} onChange={(event) => setJoinPassword(event.target.value)} /><button disabled={pending || !code.trim() || !joinPassword} onClick={() => void join()}>Entrar <span>→</span></button></div></section>
    {message && <p role="alert" className={styles.message}>{message}</p>}
    <footer className={gateStyles.footer}><span>El resto de Canastio se activa al entrar en una liga.</span><LogoutControl /></footer>
  </main>;
}
