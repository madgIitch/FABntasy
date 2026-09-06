"use client";

import { useMemo, useState } from "react";
import styles from "./fantasy-team-manager.module.css";

type Player = { playerRegistrationId: string; displayName: string; realTeamName: string; acquisitionPrice: number; currentMarketPrice?: number | null };
type Team = { version: number; budgetTotal: number; budgetUsed: number; budgetRemaining: number; roster: Player[]; lineup: null | { status: string; cutoffAt: string; starters: Player[]; substitutes: Player[] } };
type View = "court" | "points" | "market" | "form";
type Status = "ready" | "saving" | "saved" | "error" | "offline" | "conflict";

const views: { id: View; label: string }[] = [{ id: "court", label: "Cancha" }, { id: "points", label: "Puntos" }, { id: "market", label: "Mercado" }, { id: "form", label: "Forma" }];
const credits = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });

export function FantasyTeamManager({ competitionSeasonId, roundNumber, initialTeam, eligiblePlayers = [] }: { competitionSeasonId: string; roundNumber: number; initialTeam: Team | null; eligiblePlayers?: Player[] }) {
  const [team, setTeam] = useState(initialTeam);
  const [view, setView] = useState<View>("court");
  const [status, setStatus] = useState<Status>("ready");
  const initialStarters = initialTeam?.lineup?.starters.map((player) => player.playerRegistrationId) ?? initialTeam?.roster.slice(0, 5).map((player) => player.playerRegistrationId) ?? [];
  const [starters, setStarters] = useState<string[]>(initialStarters);
  const [rosterDraft, setRosterDraft] = useState<string[]>([]);
  const substitutes = useMemo(() => team?.roster.filter((player) => !starters.includes(player.playerRegistrationId)) ?? [], [starters, team]);
  const locked = team?.lineup?.status === "LOCKED";

  function toggleStarter(id: string) {
    if (locked) return;
    setStarters((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 5 ? [...current, id] : current);
    setStatus("ready");
  }

  async function saveLineup() {
    if (!team || !navigator.onLine) { setStatus("offline"); return; }
    setStatus("saving");
    try {
      const response = await fetch(`/api/fantasy/team/lineups/${roundNumber}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ competitionSeasonId, starterPlayerRegistrationIds: starters, substitutePlayerRegistrationIds: substitutes.map((player) => player.playerRegistrationId), expectedVersion: team.version }) });
      const body = await response.json();
      if (body.error?.code === "VERSION_CONFLICT") { setStatus("conflict"); return; }
      if (!response.ok) { setStatus("error"); return; }
      setTeam(body.data); setStatus("saved");
    } catch { setStatus("offline"); }
  }

  async function createRoster() {
    if (!navigator.onLine) { setStatus("offline"); return; }
    setStatus("saving");
    try {
      const response = await fetch("/api/fantasy/team", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ competitionSeasonId, expectedVersion: null, playerRegistrationIds: rosterDraft }) });
      const body = await response.json();
      if (!response.ok) { setStatus("error"); return; }
      setTeam(body.data); setStarters(body.data.roster.slice(0, 5).map((player: Player) => player.playerRegistrationId)); setStatus("saved");
    } catch { setStatus("offline"); }
  }

  if (!team) return <main className={`app-main ${styles.page}`}><Header roundNumber={roundNumber} /><section className={styles.builder}>
    <div><p className="eyebrow">Plantilla inicial</p><h2>Elige tus siete</h2><p>Máximo dos jugadores del mismo equipo. Cada alta cuesta 3 M.</p></div>
    <fieldset className={styles.available}><legend>{rosterDraft.length} de 7 seleccionados</legend>{eligiblePlayers.map((player) => <label key={player.playerRegistrationId}><input type="checkbox" checked={rosterDraft.includes(player.playerRegistrationId)} disabled={!rosterDraft.includes(player.playerRegistrationId) && rosterDraft.length >= 7} onChange={(event) => setRosterDraft((current) => event.target.checked ? [...current, player.playerRegistrationId] : current.filter((id) => id !== player.playerRegistrationId))} /><span><strong>{player.displayName}</strong><small>{player.realTeamName}</small></span><b>{credits.format(player.acquisitionPrice)}</b></label>)}</fieldset>
    <button className={styles.primary} disabled={rosterDraft.length !== 7 || status === "saving"} onClick={() => void createRoster()}>{status === "saving" ? "Creando…" : "Crear equipo"}</button><Feedback status={status} />
  </section></main>;

  const startersList = team.roster.filter((player) => starters.includes(player.playerRegistrationId));
  return <main className={`app-main ${styles.page}`}><Header roundNumber={roundNumber} />
    <nav className={styles.views} aria-label="Vista del equipo">{views.map((item) => <button key={item.id} className={view === item.id ? styles.active : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</nav>
    <section className={styles.summary} aria-label="Presupuesto"><span><small>Valor de compra</small><strong>{credits.format(team.budgetUsed)}</strong></span><span><small>Disponible</small><strong>{credits.format(team.budgetRemaining)}</strong></span><span><small>Plantilla</small><strong>{team.roster.length}/7</strong></span></section>
    {locked && <p className={styles.locked}>Alineación cerrada · snapshot de la jornada {roundNumber}</p>}
    <div className={styles.stage} key={view}>{view === "court" ? <Court players={startersList} selected={starters} locked={locked} onToggle={toggleStarter} /> : <DataView view={view} players={team.roster} starters={starters} />}</div>
    <section className={styles.bench}><div><p className="eyebrow">Rotación</p><h2>Banquillo</h2></div><div className={styles.benchPlayers}>{substitutes.map((player) => <PlayerButton key={player.playerRegistrationId} player={player} active={false} locked={locked} onClick={() => toggleStarter(player.playerRegistrationId)} />)}</div></section>
    <Feedback status={status} /><button className={styles.primary} disabled={locked || starters.length !== 5 || status === "saving"} onClick={() => void saveLineup()}>{status === "saving" ? "Guardando…" : locked ? "Jornada cerrada" : "Guardar quinteto"}</button>
  </main>;
}

function Header({ roundNumber }: { roundNumber: number }) { return <header className={`workspace-header ${styles.header}`}><div><p className="eyebrow">Jornada {String(roundNumber).padStart(2, "0")}</p><h1>Mi equipo</h1></div><span className="live-status"><i /> Plantilla activa</span></header>; }
function Court({ players, selected, locked, onToggle }: { players: Player[]; selected: string[]; locked: boolean; onToggle: (id: string) => void }) { return <section className={styles.court} aria-label="Quinteto titular"><div className={styles.centerCircle} />{players.map((player, index) => <div className={`${styles.courtPlayer} ${styles[`spot${index + 1}`]}`} key={player.playerRegistrationId}><PlayerButton player={player} active={selected.includes(player.playerRegistrationId)} locked={locked} onClick={() => onToggle(player.playerRegistrationId)} /></div>)}</section>; }
function PlayerButton({ player, active, locked, onClick }: { player: Player; active: boolean; locked: boolean; onClick: () => void }) { return <button className={styles.player} data-active={active} disabled={locked} onClick={onClick}><span>{player.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><strong>{player.displayName}</strong><small>{player.realTeamName}</small></button>; }
function DataView({ view, players, starters }: { view: Exclude<View, "court">; players: Player[]; starters: string[] }) { const label = view === "points" ? "Puntos de jornada" : view === "market" ? "Valor de mercado" : "Estado reciente"; return <section className={styles.dataView}><header><p className="eyebrow">{label}</p><h2>Los mismos jugadores.<br />Otra lectura.</h2></header><ol>{players.map((player) => <li key={player.playerRegistrationId}><span><i>{starters.includes(player.playerRegistrationId) ? "T" : "S"}</i><strong>{player.displayName}</strong><small>{player.realTeamName}</small></span><b>{view === "market" ? credits.format(player.currentMarketPrice ?? player.acquisitionPrice) : "—"}</b></li>)}</ol></section>; }
function Feedback({ status }: { status: Status }) { if (status === "ready") return null; const copy = { saving: "Guardando cambios…", saved: "Quinteto guardado.", error: "No se pudo guardar. Revisa la jornada y vuelve a intentarlo.", offline: "Sin conexión. El borrador sigue en este dispositivo.", conflict: "El equipo cambió en otra sesión. Conservamos tu selección para que puedas revisarla." }[status]; return <p className={styles.feedback} role={status === "error" || status === "conflict" ? "alert" : "status"}>{copy}</p>; }
