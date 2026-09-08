"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import styles from "./fantasy-team-manager.module.css";

type Player = { playerRegistrationId: string; displayName: string; realTeamName: string; acquisitionPrice: number; currentMarketPrice?: number | null };
type Team = { version: number; budgetTotal: number; budgetUsed: number; budgetRemaining: number; roster: Player[]; lineup: null | { status: string; cutoffAt: string; starters: Player[]; substitutes: Player[] } };
type View = "court" | "points" | "value" | "form";
type Status = "ready" | "saving" | "saved" | "error" | "offline" | "conflict";
type PlayerMetrics = Record<string, { roundPoints: number | null; recentPoints: number[] }>;

const views: { id: View; label: string }[] = [{ id: "court", label: "Cancha" }, { id: "points", label: "Puntos" }, { id: "value", label: "Valor" }, { id: "form", label: "Forma" }];
const credits = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });

export function FantasyTeamManager({ competitionSeasonId, roundNumber, initialTeam, eligiblePlayers = [], playerMetrics = {}, cutoffAt = null }: { competitionSeasonId: string; roundNumber: number; initialTeam: Team | null; eligiblePlayers?: Player[]; playerMetrics?: PlayerMetrics; cutoffAt?: string | null }) {
  const [team, setTeam] = useState(initialTeam);
  const [view, setView] = useState<View>("court");
  const [status, setStatus] = useState<Status>("ready");
  const initialStarters = initialTeam?.lineup?.starters.map((player) => player.playerRegistrationId) ?? initialTeam?.roster.slice(0, 5).map((player) => player.playerRegistrationId) ?? [];
  const [starters, setStarters] = useState<string[]>(initialStarters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rosterDraft, setRosterDraft] = useState<string[]>([]);
  const substitutes = useMemo(() => team?.roster.filter((player) => !starters.includes(player.playerRegistrationId)) ?? [], [starters, team]);
  const savedStarters = team?.lineup?.starters.map((player) => player.playerRegistrationId) ?? initialStarters;
  const dirty = team?.lineup ? starters.join("|") !== savedStarters.join("|") : team?.roster.length === 7;
  const changedPlayers = starters.filter((id) => !savedStarters.includes(id)).length;
  const locked = team?.lineup?.status === "LOCKED";

  function selectForSwap(id: string) {
    if (locked) return;
    if (selectedId === id) { setSelectedId(null); return; }
    if (!selectedId) { setSelectedId(id); return; }
    const selectedIsStarter = starters.includes(selectedId);
    const targetIsStarter = starters.includes(id);
    if (selectedIsStarter === targetIsStarter) { setSelectedId(id); return; }
    setStarters((current) => current.map((starterId) => starterId === (selectedIsStarter ? selectedId : id) ? (selectedIsStarter ? id : selectedId) : starterId));
    setSelectedId(null);
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

  if (!team) return <main className={`app-main ${styles.page}`}><Header roundNumber={roundNumber} locked={false} cutoffAt={cutoffAt} /><section className={styles.builder}>
    <div><p className="eyebrow">Plantilla inicial</p><h2>Elige tus siete</h2><p>Máximo dos jugadores del mismo equipo. El precio vigente se confirma al guardar.</p></div>
    <fieldset className={styles.available}><legend>{rosterDraft.length} de 7 seleccionados</legend>{eligiblePlayers.map((player) => <label key={player.playerRegistrationId}><input type="checkbox" checked={rosterDraft.includes(player.playerRegistrationId)} disabled={!rosterDraft.includes(player.playerRegistrationId) && rosterDraft.length >= 7} onChange={(event) => setRosterDraft((current) => event.target.checked ? [...current, player.playerRegistrationId] : current.filter((id) => id !== player.playerRegistrationId))} /><span><strong>{player.displayName}</strong><small>{player.realTeamName}</small></span><b>{credits.format(player.acquisitionPrice)}</b></label>)}</fieldset>
    <button className={styles.primary} disabled={rosterDraft.length !== 7 || status === "saving"} onClick={() => void createRoster()}>{status === "saving" ? "Creando…" : "Crear equipo"}</button><Feedback status={status} />
  </section></main>;

  const startersList = starters.map((id) => team.roster.find((player) => player.playerRegistrationId === id)).filter((player): player is Player => Boolean(player));
  return <main className={`app-main ${styles.page}`}><Header roundNumber={roundNumber} locked={locked} cutoffAt={team.lineup?.cutoffAt ?? cutoffAt} />
    <section className={styles.summary} aria-label="Resumen de plantilla"><span><strong>{credits.format(team.budgetUsed)}</strong><small>Coste plantilla</small></span><span><strong>{credits.format(team.budgetRemaining)}</strong><small>Disponible</small></span><span><strong>{team.roster.length}/7</strong><small>Jugadores</small></span></section>
    <nav className={styles.views} aria-label="Vista del equipo">{views.map((item) => <button key={item.id} aria-pressed={view === item.id} className={view === item.id ? styles.active : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</nav>
    {locked && <p className={styles.locked}>Alineación cerrada · snapshot de la jornada {roundNumber}</p>}
    <div className={styles.stage} key={view}>{view === "court" ? <LineupSurface players={startersList} substitutes={substitutes} rosterSize={team.roster.length} selectedId={selectedId} locked={locked} onSelect={selectForSwap} /> : view === "points" ? <PointsView players={team.roster} starters={starters} metrics={playerMetrics} /> : <DataView view={view} players={team.roster} starters={starters} metrics={playerMetrics} />}</div>
    {!dirty && status === "saved" && <p className={styles.saved} role="status">✓ Alineación guardada</p>}
    <Feedback status={status === "saved" ? "ready" : status} />
    {dirty && !locked && <aside className={styles.saveDock} aria-live="polite"><span><strong>{team.lineup ? `${changedPlayers || 1} cambio${(changedPlayers || 1) === 1 ? "" : "s"}` : "Primera alineación"}</strong><small> sin guardar</small></span><button disabled={team.roster.length !== 7 || starters.length !== 5 || status === "saving"} onClick={() => void saveLineup()}>{status === "saving" ? "Guardando…" : "Guardar"}</button></aside>}
  </main>;
}

function Header({ roundNumber, locked, cutoffAt }: { roundNumber: number; locked: boolean; cutoffAt: string | null }) {
  const cutoff = cutoffAt ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(cutoffAt)) : null;
  return <header className={`workspace-header ${styles.header}`}><div><p className="eyebrow">Jornada {String(roundNumber).padStart(2, "0")}</p><h1>Mi equipo</h1></div><span className={styles.lineupStatus}>{locked ? "🔒" : <i />}<b>Alineación {locked ? "cerrada" : "abierta"}</b>{!locked && cutoff && <small>Hasta {cutoff}</small>}</span></header>;
}

function LineupSurface({ players, substitutes, rosterSize, selectedId, locked, onSelect }: { players: Player[]; substitutes: Player[]; rosterSize: number; selectedId: string | null; locked: boolean; onSelect: (id: string) => void }) {
  return <section className={styles.lineupSurface} aria-label="Gestor de alineación">
    <p className={styles.hint}>{locked ? "Esta alineación ya no admite cambios." : selectedId ? "Ahora toca un jugador de la otra zona para intercambiarlos." : "Toca un titular y después un suplente para intercambiarlos."}</p>
    <div className={styles.court} aria-label="Quinteto titular"><div className={styles.centerCircle} />{players.map((player, index) => <div className={`${styles.courtPlayer} ${styles[`spot${index + 1}`]}`} key={player.playerRegistrationId}><PlayerButton player={player} selected={selectedId === player.playerRegistrationId} locked={locked} onClick={() => onSelect(player.playerRegistrationId)} /></div>)}</div>
    <div className={styles.bench}><header><div><p className="eyebrow">Rotación</p><h2>Banquillo</h2></div><span>{substitutes.length}/2</span></header><div className={styles.benchPlayers}>{substitutes.map((player) => <PlayerButton key={player.playerRegistrationId} player={player} selected={selectedId === player.playerRegistrationId} locked={locked} onClick={() => onSelect(player.playerRegistrationId)} />)}{Array.from({ length: Math.max(0, 7 - rosterSize) }).map((_, index) => <Link href="/app/mercado" className={styles.emptySlot} key={index}><span>+</span><strong>Añadir jugador</strong><small>Ir al mercado</small></Link>)}</div></div>
  </section>;
}

function shortName(name: string) { const parts = name.trim().split(/\s+/); return parts.length < 2 ? name : `${parts[0][0]}. ${parts[1]}`; }
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function PlayerButton({ player, selected, locked, onClick }: { player: Player; selected: boolean; locked: boolean; onClick: () => void }) { return <button className={styles.player} data-selected={selected} disabled={locked} onClick={onClick} aria-label={`${player.displayName}, ${player.realTeamName}${selected ? ", seleccionado" : ""}`}><span>{initials(player.displayName)}</span><strong>{shortName(player.displayName)}</strong><small>{player.realTeamName}</small></button>; }

function PointsView({ players, starters, metrics }: { players: Player[]; starters: string[]; metrics: PlayerMetrics }) {
  const starterPlayers = starters.map((id) => players.find((player) => player.playerRegistrationId === id)).filter((player): player is Player => Boolean(player));
  const substitutePlayers = players.filter((player) => !starters.includes(player.playerRegistrationId));
  const scoredStarters = starterPlayers.filter((player) => metrics[player.playerRegistrationId]?.roundPoints != null);
  const total = scoredStarters.reduce((sum, player) => sum + (metrics[player.playerRegistrationId]?.roundPoints ?? 0), 0);
  const hasPoints = scoredStarters.length > 0;
  return <section className={styles.pointsView}>
    <header className={styles.pointsHero}><p className="eyebrow">Puntos de jornada</p><div><strong>{hasPoints ? total.toFixed(1) : "—"}</strong><span>pts Fantasy</span></div><p>{hasPoints ? `${scoredStarters.length}/${starterPlayers.length} titulares con puntuación` : "Los puntos aparecerán cuando empiecen a registrarse los partidos."}</p></header>
    <PointGroup title="Titulares" note={`${starterPlayers.length} jugadores · suman al total`} players={starterPlayers} metrics={metrics} />
    {substitutePlayers.length > 0 && <PointGroup title="Banquillo" note="No suma al total" players={substitutePlayers} metrics={metrics} />}
  </section>;
}

function PointGroup({ title, note, players, metrics }: { title: string; note: string; players: Player[]; metrics: PlayerMetrics }) { return <section className={styles.pointGroup}><header><span><b>{title}</b><small>{note}</small></span><em>Pts.</em></header><ol>{players.map((player) => { const value = metrics[player.playerRegistrationId]?.roundPoints; return <li key={player.playerRegistrationId}><span><strong>{player.displayName}</strong><small>{player.realTeamName}</small></span><b className={value == null ? styles.noData : styles.score}>{value == null ? "—" : value.toFixed(1)}</b></li>; })}</ol></section>; }

function DataView({ view, players, starters, metrics }: { view: Exclude<View, "court" | "points">; players: Player[]; starters: string[]; metrics: PlayerMetrics }) {
  const label = view === "value" ? "Valor de mercado" : "Últimos cinco partidos";
  const title = view === "value" ? "Valor de tu plantilla" : "Momento de cada jugador";
  return <section className={styles.dataView}><header><p className="eyebrow">{label}</p><h2>{title}</h2><p>{view === "form" ? "La secuencia va del partido más reciente al más antiguo." : "El precio de compra permanece congelado."}</p></header><ol>{players.map((player) => { const metric = metrics[player.playerRegistrationId]; const recent = metric?.recentPoints ?? []; const average = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : null; return <li key={player.playerRegistrationId}><span><i>{starters.includes(player.playerRegistrationId) ? "T" : "S"}</i><strong>{player.displayName}</strong><small>{player.realTeamName}</small></span>
    {view === "value" && <span className={styles.marketValue}><b>{credits.format(player.currentMarketPrice ?? player.acquisitionPrice)}</b><small>{player.currentMarketPrice == null ? "Precio pagado" : `${player.currentMarketPrice - player.acquisitionPrice >= 0 ? "+" : ""}${credits.format(player.currentMarketPrice - player.acquisitionPrice)} plusvalía`}</small></span>}
    {view === "form" && <div className={styles.formLine}>{recent.length ? <><span>{recent.map((value, index) => <em key={index} style={{ "--level": `${Math.max(12, Math.min(100, value * 2))}%` } as CSSProperties} title={`${value.toFixed(1)} puntos`} />)}</span><b>{average!.toFixed(1)} <small>media</small></b></> : <b className={styles.noData}>Sin partidos</b>}</div>}
  </li>; })}</ol></section>;
}

function Feedback({ status }: { status: Status }) { if (status === "ready") return null; const copy = { saving: "Guardando cambios…", saved: "Alineación guardada.", error: "No se pudo guardar. Revisa la jornada y vuelve a intentarlo.", offline: "Sin conexión. El borrador sigue en este dispositivo.", conflict: "El equipo cambió en otra sesión. Conservamos tu selección para que puedas revisarla." }[status]; return <p className={styles.feedback} role={status === "error" || status === "conflict" ? "alert" : "status"}>{copy}</p>; }
