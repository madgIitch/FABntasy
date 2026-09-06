"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./canastio-market.module.css";

export type MarketPlayer = { playerRegistrationId: string; playerId: string; displayName: string; realTeamName: string; competitionName: string; status: string; currentPrice: number;
  previousPrice: number | null; changeCredits: number; changePercent: number | null; trend: "UP" | "DOWN" | "FLAT"; allTimeHigh: number; allTimeLow: number;
  averageFantasyPoints: number | null; recentFantasyPoints: readonly number[] };

const money = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 2 });

export function CanastioMarket({ players, updatedAt }: { players: readonly MarketPlayer[]; updatedAt?: string }) {
  const [query, setQuery] = useState(""); const [trend, setTrend] = useState<"ALL" | MarketPlayer["trend"]>("ALL");
  const [team, setTeam] = useState("ALL"); const [price, setPrice] = useState("ALL"); const [minimumFantasy, setMinimumFantasy] = useState("0");
  const teams = useMemo(() => [...new Set(players.map((player) => player.realTeamName))].sort((a, b) => a.localeCompare(b, "es")), [players]);
  const visible = useMemo(() => players.filter((player) => {
    const matchesPrice = price === "ALL" || (price === "UNDER_5" && player.currentPrice < 5_000_000) || (price === "5_TO_10" && player.currentPrice >= 5_000_000 && player.currentPrice <= 10_000_000) || (price === "OVER_10" && player.currentPrice > 10_000_000);
    return `${player.displayName} ${player.realTeamName}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")) && (trend === "ALL" || player.trend === trend) && (team === "ALL" || player.realTeamName === team) && matchesPrice && (player.averageFantasyPoints ?? 0) >= Number(minimumFantasy);
  }), [players, query, trend, team, price, minimumFantasy]);
  return <main className={styles.market}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Mercado global · {players[0]?.competitionName}</p><h1>La Bolsa Canastio</h1><p>Precios guiados por rendimiento. La popularidad no altera la cotización.</p></div><div className={styles.ticker}><span>Jugadores</span><strong>{players.length}</strong><small>{updatedAt ? `Actualizado ${new Date(updatedAt).toLocaleDateString("es-ES")}` : "Calibración · 5 M"}</small></div></header>
    <section className={styles.controls} aria-label="Filtros de mercado"><label className={styles.search}><span>Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jugador o equipo…" /></label>
      <label><span>Equipo</span><select value={team} onChange={(event) => setTeam(event.target.value)}><option value="ALL">Todos</option>{teams.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label><span>Precio</span><select value={price} onChange={(event) => setPrice(event.target.value)}><option value="ALL">Cualquiera</option><option value="UNDER_5">Menos de 5 M</option><option value="5_TO_10">5–10 M</option><option value="OVER_10">Más de 10 M</option></select></label>
      <label><span>Media FP</span><select value={minimumFantasy} onChange={(event) => setMinimumFantasy(event.target.value)}><option value="0">Cualquiera</option><option value="10">10+</option><option value="20">20+</option><option value="30">30+</option></select></label>
      <div role="group" aria-label="Tendencia">{(["ALL", "UP", "DOWN", "FLAT"] as const).map((value) => <button key={value} data-active={trend === value} onClick={() => setTrend(value)}>{value === "ALL" ? "Todos" : value === "UP" ? "Suben" : value === "DOWN" ? "Bajan" : "Estables"}</button>)}</div></section>
    <div className={styles.resultBar}><span>{visible.length} resultados</span><span>Precio</span><span>Variación</span></div>
    {visible.length === 0 ? <p className={styles.empty}>No hay jugadores para este filtro.</p> : <ol className={styles.list}>{visible.map((player, index) => <li key={player.playerRegistrationId}>
      <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span><span className={styles.avatar} aria-hidden="true">{initials(player.displayName)}</span><span className={styles.identity}><Link href={`/app/jugadores/${player.playerId}`}>{player.displayName}</Link><small>{player.realTeamName} · {player.status === "PROVISIONAL" || player.status === "INSUFFICIENT_MARKET_SAMPLE" ? "Provisional" : "Confirmado"}</small></span>
      <span className={styles.form}><b>{player.averageFantasyPoints?.toFixed(1) ?? "—"}</b><small>FP media</small><i>{player.recentFantasyPoints.length ? player.recentFantasyPoints.map((score) => score.toFixed(0)).join(" · ") : "Sin partidos"}</i></span>
      <strong className={styles.price}>{money.format(player.currentPrice)}</strong><span className={styles.change} data-trend={player.trend}>{player.changePercent === null ? "Nuevo" : `${player.changePercent >= 0 ? "▲" : "▼"} ${Math.abs(player.changePercent).toFixed(1)}%`}</span>
    </li>)}</ol>}
    <footer className={styles.note}>Valores expresados en créditos del juego. El rendimiento deportivo determina el precio; la popularidad no lo modifica.</footer>
  </main>;
}

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
