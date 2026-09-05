"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./fantasy-team-manager.module.css";

type Player = { playerRegistrationId: string; displayName: string; realTeamName: string; acquisitionPrice: number };
type Team = { version: number; budget: { total: number; used: number; remaining: number }; roster: Player[]; lineup: null | { status: "DRAFT" | "LOCKED"; cutoffAt: string; starters: Player[]; substitutes: Player[] } };
type ViewState = "loading" | "empty" | "ready" | "saving" | "saved" | "error" | "offline" | "conflict";

const credits = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

export function FantasyTeamManager({ competitionSeasonId, roundNumber, initialTeam, eligiblePlayers = [] }: { competitionSeasonId: string; roundNumber: number; initialTeam?: Team | null; eligiblePlayers?: Player[] }) {
  const [team, setTeam] = useState<Team | null>(initialTeam ?? null);
  const [state, setState] = useState<ViewState>(initialTeam === undefined ? "loading" : initialTeam ? "ready" : "empty");
  const [starters, setStarters] = useState<string[]>(initialTeam?.lineup?.starters.map((x) => x.playerRegistrationId) ?? []);
  const [rosterDraft, setRosterDraft] = useState<string[]>([]);
  useEffect(() => {
    const offline = () => setState("offline");
    const online = () => setState((current) => current === "offline" ? (team ? "ready" : "empty") : current);
    window.addEventListener("offline", offline); window.addEventListener("online", online);
    if (!navigator.onLine) offline();
    return () => { window.removeEventListener("offline", offline); window.removeEventListener("online", online); };
  }, [team]);
  useEffect(() => {
    if (initialTeam !== undefined) return;
    const controller = new AbortController();
    fetch(`/api/fantasy/teams/${competitionSeasonId}?roundNumber=${roundNumber}`, { signal: controller.signal })
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (response.status === 404) { setState("empty"); return; }
        if (!response.ok) { setState("error"); return; }
        setTeam(body.data); setStarters(body.data.lineup?.starters.map((x: Player) => x.playerRegistrationId) ?? []); setState("ready");
      })
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setState(navigator.onLine ? "error" : "offline"); });
    return () => controller.abort();
  }, [competitionSeasonId, initialTeam, roundNumber]);
  const substitutes = useMemo(() => team?.roster.filter((x) => !starters.includes(x.playerRegistrationId)) ?? [], [team, starters]);

  async function saveLineup(roundNumber: number) {
    if (!team || !navigator.onLine) { setState("offline"); return; }
    setState("saving");
    try {
      const response = await fetch(`/api/fantasy/teams/${competitionSeasonId}/lineups/${roundNumber}`, { method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ starters, substitutes: substitutes.map((x) => x.playerRegistrationId), expectedVersion: team.version }) });
      const body = await response.json();
      if (body.error?.code === "VERSION_CONFLICT") { setState("conflict"); return; }
      if (!response.ok) { setState("error"); return; }
      setTeam(body.data); setState("saved");
    } catch { setState("offline"); }
  }

  async function saveRoster() {
    if (!navigator.onLine) { setState("offline"); return; }
    setState("saving");
    try {
      const response = await fetch(`/api/fantasy/teams/${competitionSeasonId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ playerRegistrationIds: rosterDraft }) });
      const body = await response.json();
      if (!response.ok) { setState(body.error?.code === "VERSION_CONFLICT" ? "conflict" : "error"); return; }
      setTeam(body.data); setState("saved");
    } catch { setState("offline"); }
  }

  if (state === "loading") return <section className={styles.panel} aria-live="polite"><h1>Mi equipo</h1><p>Cargando plantilla…</p></section>;
  if (!team && ["empty", "saving", "error", "offline", "conflict"].includes(state)) return <section className={styles.panel} aria-busy={state === "saving"}>
    <h1>Mi equipo</h1><h2>Tu plantilla está vacía</h2><p>Elige siete jugadores para empezar: cinco titulares y dos suplentes.</p>
    {state === "offline" && <p className={styles.notice} role="status">Sin conexión. Conservamos tu selección y no enviaremos cambios.</p>}
    {state === "error" && <p className={styles.notice} role="alert">La plantilla no es válida o no se pudo guardar.</p>}
    <fieldset className={styles.picker}><legend>Jugadores disponibles · {rosterDraft.length} de 7</legend>{eligiblePlayers.map((player) => <label key={player.playerRegistrationId}>
      <input type="checkbox" checked={rosterDraft.includes(player.playerRegistrationId)} disabled={!rosterDraft.includes(player.playerRegistrationId) && rosterDraft.length >= 7}
        onChange={(event) => setRosterDraft((current) => event.target.checked ? [...current, player.playerRegistrationId] : current.filter((id) => id !== player.playerRegistrationId))} /> {player.displayName} · {player.realTeamName}
    </label>)}</fieldset>
    <button disabled={rosterDraft.length !== 7 || state === "saving" || state === "offline"} onClick={() => void saveRoster()}>{state === "saving" ? "Guardando…" : "Crear plantilla"}</button>
  </section>;
  if (!team) return <section className={styles.panel}><h1>Mi equipo</h1><p>No se pudo mostrar la plantilla.</p></section>;
  const locked = team.lineup?.status === "LOCKED";
  return <section className={styles.panel} aria-busy={state === "saving"}>
    <header><p className={styles.eyebrow}>Plantilla fantasy</p><h1>Mi equipo</h1></header>
    <div className={styles.budget} aria-label="Resumen de presupuesto">
      <span><small>Presupuesto total</small>{credits.format(team.budget.total)} créditos</span>
      <span><small>Usado</small>{credits.format(team.budget.used)} créditos</span>
      <span><small>Restante</small>{credits.format(team.budget.remaining)} créditos</span>
    </div>
    {state === "offline" && <p className={styles.notice} role="status">Sin conexión. Tu borrador se conserva en este dispositivo y no se enviará todavía.</p>}
    {state === "conflict" && <p className={styles.notice} role="alert">La plantilla cambió en otro lugar. Tu borrador sigue aquí: recarga o vuelve a aplicarlo.</p>}
    {state === "error" && <p className={styles.notice} role="alert">No se pudo guardar. Revisa la alineación e inténtalo de nuevo.</p>}
    {state === "saved" && <p className={styles.success} role="status">Alineación guardada.</p>}
    {locked && <p className={styles.locked}><strong>Alineación congelada</strong><br />Solo lectura desde {new Date(team.lineup!.cutoffAt).toLocaleString("es-ES")}.</p>}
    <div className={styles.columns}>
      <RosterGroup title="Titulares" hint="Puntúan esta jornada" players={team.roster.filter((x) => starters.includes(x.playerRegistrationId))} />
      <RosterGroup title="Banquillo" hint="Suplentes" players={substitutes} />
    </div>
    <button disabled={locked || state === "saving" || state === "offline" || starters.length !== 5} onClick={() => void saveLineup(roundNumber)}>
      {state === "saving" ? "Guardando…" : locked ? "Alineación congelada" : "Guardar alineación"}
    </button>
    {!locked && <fieldset className={styles.picker}><legend>Elegir cinco titulares</legend>{team.roster.map((player) => <label key={player.playerRegistrationId}>
      <input type="checkbox" checked={starters.includes(player.playerRegistrationId)} disabled={!starters.includes(player.playerRegistrationId) && starters.length >= 5}
        onChange={(event) => setStarters((current) => event.target.checked ? [...current, player.playerRegistrationId] : current.filter((id) => id !== player.playerRegistrationId))} /> {player.displayName}
    </label>)}</fieldset>}
  </section>;
}

function RosterGroup({ title, hint, players }: { title: string; hint: string; players: Player[] }) {
  return <section className={styles.group}><h2>{title}</h2><p>{hint} · {players.length} jugadores</p><ol>{players.map((player) => <li key={player.playerRegistrationId}>
    <span><strong>{player.displayName}</strong><small>{player.realTeamName}</small></span><span>{credits.format(player.acquisitionPrice)}</span>
  </li>)}</ol></section>;
}
