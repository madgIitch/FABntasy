"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./ui/icon";

type League = { id: string; name: string; competitionName: string; teamName: string | null; memberCount: number; isActive: boolean; role: string };

export function LeagueDirectory({ leagues }: { leagues: League[] }) {
  const [activeId, setActiveId] = useState(leagues.find((league) => league.isActive)?.id ?? leagues[0]?.id ?? "");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function select(leagueId: string) {
    setPending(leagueId); setMessage("");
    const response = await fetch("/api/fantasy/leagues/active", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leagueId }) });
    setPending(null);
    if (!response.ok) { setMessage("No se pudo cambiar la liga activa."); return; }
    setActiveId(leagueId); setMessage("Liga activa actualizada.");
  }
  async function leave(league: League) {
    if (!window.confirm(`¿Abandonar la liga ${league.name}?`)) return;
    setPending(league.id); setMessage("");
    const response = await fetch(`/api/fantasy/leagues/${league.id}/leave`, { method: "POST" });
    setPending(null);
    if (!response.ok) { setMessage("No se pudo abandonar la liga."); return; }
    location.reload();
  }
  return <>
    <div className="profile-list">{leagues.length ? leagues.map((league) => <div className="profile-league-row league-directory-row" key={league.id}><span className="league-fallback" aria-hidden="true">{league.name.charAt(0).toUpperCase()}</span><span><strong>{league.name}</strong><small>{league.competitionName}</small><small>{league.teamName ?? "Sin equipo todavía"} · {league.memberCount} {league.memberCount === 1 ? "manager" : "managers"}</small></span><span className="league-directory-actions">{league.id === activeId ? <span className="league-active-label">Activa</span> : <button type="button" disabled={pending !== null} onClick={() => void select(league.id)}>{pending === league.id ? "Cambiando…" : "Activar"}</button>}{league.role !== "OWNER" ? <button className="league-leave-button" type="button" disabled={pending !== null} onClick={() => void leave(league)}>Abandonar</button> : null}</span></div>) : <div className="profile-empty"><p>Todavía no perteneces a ninguna liga.</p></div>}</div>
    {message ? <p className="form-message" role="status">{message}</p> : null}
    <section className="profile-group" aria-labelledby="add-league-title"><div className="profile-group-heading"><h2 id="add-league-title">Añadir liga</h2></div><div className="profile-list settings-list"><Link className="setting-row settings-link" href="/app/perfil/ligas/crear"><span><strong>Crear nueva liga</strong><small>Organiza una competición para tu grupo</small></span><Icon name="chevron" /></Link><Link className="setting-row settings-link" href="/app/perfil/ligas/unirse"><span><strong>Unirme con enlace</strong><small>Entra en la liga de tus amigos</small></span><Icon name="chevron" /></Link></div></section>
  </>;
}
