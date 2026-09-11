"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { JourneyData, JourneyPlayer } from "../server/journey";
import styles from "./journey-live.module.css";

const number = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function ScoreChart({ values }: { values: number[] }) {
  const points = useMemo(() => { const max = Math.max(1, ...values); return [[0, 96], ...values.map((value, index) => [25 + (index * 75 / Math.max(1, values.length - 1)), 96 - (value / max * 78)])].map((pair) => pair.join(",")).join(" "); }, [values]);
  return <figure className={styles.chart}><div><p>Evolución</p><strong>Cómo creció tu jornada</strong></div><svg viewBox="0 0 100 108" role="img" aria-label={`Evolución acumulada: ${values.map((value) => number.format(value)).join(", ")} puntos`} preserveAspectRatio="none"><path className={styles.grid} d="M0 96H100M0 70H100M0 44H100M0 18H100"/><polyline className={styles.line} points={points}/>{values.map((value, index) => { const max = Math.max(1, ...values); return <circle key={index} cx={25 + (index * 75 / Math.max(1, values.length - 1))} cy={96 - (value / max * 78)} r="1.7"/>; })}</svg><figcaption>{number.format(values.at(-1) ?? 0)} puntos acumulados por tus titulares.</figcaption></figure>;
}

function EvolutionEmpty() { return <section className={styles.chartEmpty}><p>Evolución</p><strong>Cómo creció tu jornada</strong><span aria-hidden="true">○────○────○</span><small>La evolución aparecerá cuando tus jugadores empiecen a puntuar.</small></section>; }

export function JourneyLive({ data }: { data: JourneyData | null }) {
  const router = useRouter(); const refreshing = useRef(false);
  useEffect(() => { if (data?.state !== "LIVE" && data?.state !== "PROVISIONAL") return; const refresh = () => { if (document.visibilityState !== "visible" || refreshing.current) return; refreshing.current = true; router.refresh(); window.setTimeout(() => { refreshing.current = false; }, 1500); }; const timer = window.setInterval(refresh, 30000); return () => window.clearInterval(timer); }, [data?.state, router]);
  if (!data) return <main className={styles.empty}><span aria-hidden="true">05</span><p>Jornada</p><h1>Prepara tu quinteto</h1><strong>Aún no hay un equipo activo para puntuar.</strong><Link href="/app/mi-equipo">Crear mi equipo <b>→</b></Link></main>;
  const scored = data.players.filter((player) => player.state === "FINAL" || player.state === "DNP").length;
  const hasLineup = data.players.length > 0;
  return <main className={styles.page} data-state={data.state}>
    <header className={styles.header}><div><p>{data.league} · {data.competition}</p><h1>Jornada {String(data.roundNumber).padStart(2, "0")}</h1>{data.roundDates && <span>{data.roundDates}</span>}</div><div className={styles.status}><i/><span>{data.stateLabel}</span></div></header>
    <nav className={styles.roundNav} aria-label="Cambiar jornada">{data.rounds.slice(0, 6).map((round) => <Link className={round === data.roundNumber ? styles.selected : ""} href={`/app/jornada?round=${round}`} key={round} aria-current={round === data.roundNumber ? "page" : undefined}>J{String(round).padStart(2, "0")}</Link>)}</nav>
    {data.correction && <aside className={styles.correctionNotice} role="status"><strong>Jornada recalculada</strong><span>{data.correction.reason}</span><time dateTime={data.correction.publishedAt}>{new Intl.DateTimeFormat("es-ES",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Madrid"}).format(new Date(data.correction.publishedAt))}</time></aside>}
    <section className={styles.scoreboard} aria-labelledby="team-score"><div className={styles.scoreCopy}><p>Tu jornada</p><div><strong id="team-score">{data.totalPoints === null ? "—" : number.format(Number(data.totalPoints))}</strong><span>pts Fantasy</span></div><small>{scoreSummary(data, scored, hasLineup)}</small></div></section>
    <section className={styles.lineup} aria-labelledby="lineup-title"><div className={styles.sectionHead}><div><p>Tu quinteto</p><h2 id="lineup-title">Jugador a jugador</h2></div>{hasLineup && <span>{scored}/5 partidos completados</span>}</div>{hasLineup ? data.players.map((player, index) => <PlayerRow player={player} index={index} key={player.id}/>) : <NoLineup state={data.state}/>}</section>
    {data.cumulative.length ? <ScoreChart values={data.cumulative}/> : <EvolutionEmpty/>}
  </main>;
}

function scoreSummary(data: JourneyData, scored: number, hasLineup: boolean) { if (!hasLineup) return data.state === "UPCOMING" ? "Configura tu alineación antes del cierre." : "Esta jornada no tiene una alineación válida."; if (data.state === "FINAL") return `Resultado definitivo · revisión ${data.revision}`; if (data.state === "LIVE") return `${scored}/5 partidos completados · resultado provisional`; if (data.state === "PROVISIONAL") return "Los partidos terminaron; quedan puntuaciones por validar."; return "La puntuación empezará con el primer partido."; }

function NoLineup({ state }: { state: JourneyData["state"] }) { const configurable = state === "UPCOMING"; return <div className={styles.noLineup}><strong>{configurable ? "Alineación pendiente" : "Jornada sin alineación"}</strong><p>{configurable ? "Elige tus cinco titulares antes del cierre para participar en esta jornada." : "El cierre ya pasó y no se guardó un quinteto válido para esta jornada."}</p>{configurable && <Link href="/app/mi-equipo">Configurar alineación →</Link>}</div>; }

function PlayerRow({ player, index }: { player: JourneyPlayer; index: number }) { const value=(stat:number|null)=>stat===null?"—":stat; return <details className={styles.player} style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}><summary><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{player.name}</strong><small data-player-state={player.state}><i/>{player.stateLabel}</small></div><span>{player.fantasyPoints === null ? "—" : number.format(Number(player.fantasyPoints))}<small> FP</small></span><em aria-hidden="true">⌄</em></summary><div className={styles.stats}><div><span>PTS</span><strong>{value(player.points)}</strong></div><div><span>AST</span><strong>{value(player.assists)}</strong></div><div><span>ROB</span><strong>{value(player.steals)}</strong></div><p>{player.state === "DNP" ? "No disputó el partido y aporta 0 puntos Fantasy." : player.state === "PENDING" ? "El partido terminó; la puntuación está pendiente de validación." : player.state === "UPCOMING" ? "Su partido todavía no ha comenzado." : player.statsState === "PARTIAL" ? `Estadísticas provisionales${player.statsUpdatedAt?` · actualizadas ${new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Madrid"}).format(new Date(player.statsUpdatedAt))}`:""}.` : player.statsState === "NONE" ? "Partido en juego; FAB aún no ha publicado estadísticas individuales." : "Estadísticas finales validadas."}</p></div></details>; }
