"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LeagueSwitcher as HomeLeagueSwitcher } from "./league-switcher";
import { LeagueContext } from "./league-context";
import type { HomeDashboard as Dashboard, SectionState } from "../server/home-dashboard";
import { displayPersonName, formatFreshness, heroPresentation, orderHomeSections, sportStatus } from "../server/home-presentation";
import { DashboardRefresh } from "./home-dashboard-refresh";
import styles from "./home-dashboard.module.css";

const number=new Intl.NumberFormat("es-ES",{maximumFractionDigits:1});
const credits=new Intl.NumberFormat("es-ES",{notation:"compact",maximumFractionDigits:2});
const date=new Intl.DateTimeFormat("es-ES",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Madrid"});
const activityCopy:Record<string,string>={BUY:"fichó a",SELL:"vendió a",CLAUSE:"ejecutó la cláusula de",INVEST:"blindó a",SHIELD:"protegió a"};

export function HomeDashboard({data}:{data:Dashboard}) {
  if(data.kind==="CRITICAL_ERROR")return <State title="No hemos podido cargar tu portada" body="Tus datos siguen a salvo. Inténtalo de nuevo." href="/app" action="Reintentar"/>;
  if(data.kind==="NO_PROFILE")return <State title="Completa tu perfil" body="Elige tu nombre de usuario para empezar a competir." href="/app/perfil/editar" action="Crear perfil"/>;
  if(data.kind==="NO_TEAM")return data.leagueContext?<main className={styles.page}><LeagueContext {...data.leagueContext}/><h1>Prepara tu equipo</h1><p>Tu liga está lista. Crea tu plantilla para empezar.</p><Link className={styles.textAction} href="/app/mi-equipo">Crear equipo</Link></main>:<State title="Entra en una liga" body="Crea una liga o únete con el código de tu grupo." href="/app/perfil/ligas" action="Elegir liga"/>;
  const urgent=data.round.lineupState==="INCOMPLETE"||data.round.lineupState==="NOT_SAVED";
  const hero=heroPresentation({state:data.round.lineupState,mode:data.mode,roundNumber:data.round.number,hasScore:Boolean(data.performance.data)});
  const heroHref=data.round.lineupState==="NO_CALENDAR"?"/app/competicion":hero.action==="Ver jornada"?"/app/jornada":"/app/mi-equipo";
  const sections={
    market:<Section key="market" title="Jugadores en movimiento" kicker="Mercado" href="/app/mercado" actionLabel="Ver mercado" state={data.market.state} updatedAt={data.market.updatedAt}>{data.market.data?.length?<div className={styles.rows}>{data.market.data.map((mover)=><Link href={`/app/jugadores/${mover.id}`} key={mover.id}><strong>{displayPersonName(mover.name)}<small>{mover.period}</small></strong><span>{credits.format(mover.price)} cr.</span><b className={mover.change>=0?styles.up:styles.down}>{mover.change>=0?"▲":"▼"} {Math.abs(mover.percentage).toFixed(1)}%<small>{mover.change>=0?"+":"−"}{credits.format(Math.abs(mover.change))}</small></b></Link>)}</div>:<Empty>Sin variaciones comparables todavía.</Empty>}</Section>,
    games:<Section key="games" title="Próximos partidos" kicker="Agenda" state={data.games.state} updatedAt={data.games.updatedAt}>{data.games.data?.length?<div className={styles.fixtures}>{data.games.data.map((game)=><Link href={`/app/partidos/${game.id}`} key={game.id}><time>{game.scheduledAt?date.format(new Date(game.scheduledAt)):"Hora pendiente"}</time><strong>{game.home}<i>vs</i>{game.away}</strong><span>{sportStatus(game.status)}</span><b aria-hidden="true">›</b></Link>)}</div>:<Empty>No hay próximos partidos para tu plantilla.</Empty>}</Section>,
    playedGames:<Section key="playedGames" title="Partidos jugados" kicker="Resultados" state={data.playedGames.state} updatedAt={data.playedGames.updatedAt}>{data.playedGames.data?.length?<div className={styles.results}>{data.playedGames.data.map((game)=>{const homeWon=game.homeScore!==null&&game.awayScore!==null&&game.homeScore>game.awayScore,awayWon=game.homeScore!==null&&game.awayScore!==null&&game.awayScore>game.homeScore;return <Link href={`/app/partidos/${game.id}`} key={game.id}><time>{game.scheduledAt?date.format(new Date(game.scheduledAt)):"Fecha pendiente"}</time><strong><span className={homeWon?styles.winner:undefined}>{game.home}</span><span className={awayWon?styles.winner:undefined}>{game.away}</span></strong><b><span className={homeWon?styles.winner:undefined}>{game.homeScore??"—"}</span><span className={awayWon?styles.winner:undefined}>{game.awayScore??"—"}</span></b><i aria-hidden="true">›</i></Link>})}</div>:<Empty>Todavía no hay partidos jugados por jugadores de tu plantilla.</Empty>}</Section>,
    activity:<Section key="activity" title={`Lo último en ${data.league.name}`} kicker="Actividad de la liga" href={`/app/ligas/${data.league.id}`} actionLabel="Ver liga" state={data.activity.state} updatedAt={data.activity.updatedAt}>{data.activity.data?.length?<ol className={styles.activity}>{data.activity.data.slice(0,4).map((event)=><li key={event.id}><i/><p><strong>{event.manager}</strong> {activityCopy[event.type]??"actualizó a"} <b>{displayPersonName(event.player)}{event.price>0?` por ${credits.format(event.price)}`:""}</b><small>{date.format(new Date(event.createdAt))}</small></p></li>)}</ol>:<Empty>La liga está tranquila. Los próximos movimientos aparecerán aquí.</Empty>}</Section>,
  };
  return <main className={styles.page}>
    <header className={styles.context}><div><span>{data.competition}</span><HomeLeagueSwitcher activeLeague={data.league} leagues={data.leagues}/></div></header>
    <section className={`${styles.hero} ${urgent?styles.urgent:""}`} aria-labelledby="round-title"><div className={styles.kicker}><span>{data.round.isLive?"● EN DIRECTO":data.round.number?`JORNADA ${String(data.round.number).padStart(2,"0")}`:"PRÓXIMA JORNADA"}</span>{data.round.cutoffAt?<span>{`Cierra ${date.format(new Date(data.round.cutoffAt))}`}</span>:null}</div><h1 id="round-title">{hero.title}</h1><p className={styles.implication}>{hero.implication}</p>{data.round.lineupState!=="NO_CALENDAR"?<Performance section={data.performance}/>:null}<Link className={urgent?styles.primaryAction:styles.textAction} href={heroHref}>{hero.action}</Link></section>
    {orderHomeSections(data.mode).map((key)=>sections[key])}
    <DashboardRefresh live={data.round.isLive} updatedAt={data.updatedAt}/>
  </main>;
}

function Performance({section}:{section:Extract<Dashboard,{kind:"READY"}>["performance"]}){if(section.state==="ERROR")return <p className={styles.pending}>Rendimiento no disponible</p>;if(!section.data)return <p className={styles.pending}>Puntuación y clasificación pendientes</p>;return <div className={styles.heroStats}><strong>{number.format(Number(section.data.points))}<small> pts</small></strong><span>Jornada {section.data.roundNumber}</span><span>{section.data.position?`${section.data.position}.ª posición`:"Posición pendiente"}</span>{section.data.positionChange?<b>{section.data.positionChange>0?"↑":"↓"} {Math.abs(section.data.positionChange)} pos.</b>:null}</div>}
function Section({title,kicker,href,actionLabel,state,updatedAt,children}:{title:string;kicker:string;href?:string;actionLabel?:string;state:SectionState;updatedAt:string|null;children:ReactNode}){return <section className={styles.section}><div className={styles.sectionTitle}><div><span>{kicker}</span><h2>{title}</h2></div>{href?<Link href={href}>{actionLabel??"Ver"}</Link>:null}</div>{state==="ERROR"?<Empty>No hemos podido actualizar esta sección. El resto de la portada sigue disponible.</Empty>:children}<p className={styles.freshness}>{formatFreshness(updatedAt,new Date())}</p></section>}
function Empty({children}:{children:ReactNode}){return <p className={styles.empty}>{children}</p>}
function State({title,body,href,action}:{title:string;body:string;href:string;action:string}){return <main className={styles.onboarding}><span>CANASTIO</span><h1>{title}</h1><p>{body}</p><Link href={href}>{action}<b>→</b></Link></main>}
