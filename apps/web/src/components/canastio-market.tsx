"use client";

import { useMemo, useState } from "react";
import styles from "./canastio-market.module.css";

export type MarketPlayer = { playerRegistrationId: string; displayName: string; realTeamName: string; status: string; currentPrice: number;
  previousPrice: number | null; changeCredits: number; changePercent: number | null; trend: "UP" | "DOWN" | "FLAT"; allTimeHigh: number; allTimeLow: number };

const money = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 2 });

export function CanastioMarket({ players, updatedAt }: { players: readonly MarketPlayer[]; updatedAt?: string }) {
  const [query, setQuery] = useState("");
  const [trend, setTrend] = useState<"ALL" | MarketPlayer["trend"]>("ALL");
  const visible = useMemo(() => players.filter((player) => `${player.displayName} ${player.realTeamName}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")) && (trend === "ALL" || player.trend === trend)), [players, query, trend]);
  return <main className={styles.market}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Mercado global</p><h1>La Bolsa<br />Canastio</h1></div><div className={styles.ticker}><span>Índice de jugadores</span><strong>{players.length}</strong><small>{updatedAt ? `Actualizado ${new Date(updatedAt).toLocaleDateString("es-ES")}` : "Precio provisional"}</small></div></header>
    <section className={styles.controls} aria-label="Filtros de mercado"><label><span>Buscar jugador o equipo</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Patxi Camacho…" /></label><div role="group" aria-label="Tendencia">{(["ALL", "UP", "DOWN", "FLAT"] as const).map((value) => <button key={value} data-active={trend === value} onClick={() => setTrend(value)}>{value === "ALL" ? "Todos" : value === "UP" ? "Suben" : value === "DOWN" ? "Bajan" : "Estables"}</button>)}</div></section>
    {visible.length === 0 ? <p className={styles.empty}>No hay jugadores para este filtro.</p> : <ol className={styles.list}>{visible.map((player, index) => <li key={player.playerRegistrationId}>
      <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span><span className={styles.identity}><strong>{player.displayName}</strong><small>{player.realTeamName} · {player.status === "PROVISIONAL" || player.status === "INSUFFICIENT_MARKET_SAMPLE" ? "Provisional" : "Precio confirmado"}</small></span>
      <span className={styles.range} aria-label={`Mínimo ${money.format(player.allTimeLow)}, máximo ${money.format(player.allTimeHigh)}`}><i style={{ left: `${rangePosition(player)}%` }} /></span>
      <span className={styles.change} data-trend={player.trend}>{player.changePercent === null ? "—" : `${player.changePercent >= 0 ? "+" : ""}${player.changePercent.toFixed(1)}%`}</span><strong className={styles.price}>{money.format(player.currentPrice)}</strong>
    </li>)}</ol>}
    <footer className={styles.note}>Valores expresados en créditos del juego. El rendimiento deportivo determina el precio; la popularidad no lo modifica.</footer>
  </main>;
}

function rangePosition(player: MarketPlayer) { const span = player.allTimeHigh - player.allTimeLow; return span <= 0 ? 50 : Math.max(0, Math.min(100, (player.currentPrice - player.allTimeLow) / span * 100)); }
