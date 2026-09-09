/* eslint-disable @next/next/no-html-link-for-pages -- isolated fixture navigation */
// Local-only visual fixtures. Never imported by a production route.
import { createRoot } from "react-dom/client";
import type { ComponentProps, ReactNode } from "react";
import { HomeDashboard } from "../src/components/home-dashboard";
import { CanastioMarket } from "../src/components/canastio-market";
import { FantasyTeamManager } from "../src/components/fantasy-team-manager";
import { JourneyLive } from "../src/components/journey-live";
import { LeagueHub } from "../src/components/league-hub";
import { LeagueOnboarding } from "../src/components/league-onboarding";
import { Navigation } from "../src/components/ui/navigation";
import { AccountAvatar, LogoutControl } from "../app/app/account-controls";
import { AuthForm } from "../app/auth/auth-form";
import ProfilePage from "../app/app/perfil/page";
import "../app/globals.css";

const names = ["Pablo Rodríguez Fernández", "Javier Martín", "Álvaro García", "Manuel Sánchez", "Daniel López", "Antonio Ruiz", "Carlos Medina"];
const roster = names.map((displayName,i)=>({playerRegistrationId:String(i),displayName,realTeamName:i%2?"CB Coria":"Club Baloncesto Ciudad de Sevilla",acquisitionPrice:3000000,currentMarketPrice:3450000}));
const team = {version:1,budgetTotal:30000000,budgetUsed:21000000,budgetRemaining:9000000,roster,lineup:{status:"DRAFT",cutoffAt:"2026-12-01T18:00:00Z",starters:roster.slice(0,5),substitutes:roster.slice(5)}};
const players: ComponentProps<typeof CanastioMarket>["players"] = roster.map((p,i)=>({...p,playerId:String(i),competitionName:"Primera Provincial",currentPrice:3450000,previousPrice:3000000,changeCredits:450000,changePercent:i%2?-4.5:15,trend:i%2?"DOWN":"UP",allTimeHigh:4000000,allTimeLow:3000000,averageFantasyPoints:22.5,recentFantasyPoints:[20,25,22],owner:i===1?{ownerName:"Pepe",isMine:true,acquisitionPrice:3000000,clauseInvestment:0,protection:null}:null,clauseCredits:5000000}));
const now="2026-09-07T14:00:00Z";
const home: ComponentProps<typeof HomeDashboard>["data"]={kind:"READY",updatedAt:now,displayName:"Pepe",league:{id:"demo",name:"Los del viernes"},leagues:[{id:"demo",name:"Los del viernes"}],competition:"Primera Provincial",roster:{count:7,balanceCredits:9000000},round:{number:4,cutoffAt:"2026-09-12T16:00:00Z",lineupState:"INCOMPLETE",isLive:false},performance:{points:"124.5",position:2,positionChange:1},movers:roster.slice(0,3).map(p=>({id:p.playerRegistrationId,name:p.displayName,price:3450000,change:450000,percentage:15})),games:[{id:"g1",home:"CB Coria",away:"Ciudad de Sevilla",scheduledAt:"2026-09-12T16:00:00Z"}],activity:[{id:"a1",type:"BUY",manager:"Pepe",player:"Javier Martín",price:3000000,createdAt:now}]} as ComponentProps<typeof HomeDashboard>["data"];
const journey: ComponentProps<typeof JourneyLive>["data"]={competition:"Primera Provincial",league:"Los del viernes",roundNumber:4,rounds:[4,3,2,1],state:"PROVISIONAL",stateLabel:"Calculando",totalPoints:"124.5",revision:1,players:roster.slice(0,5).map((p,i)=>({id:p.playerRegistrationId,name:p.displayName,fantasyPoints:i===4?null:"24.9",points:12,assists:3,steals:1,state:i===4?"PENDING":"FINAL",stateLabel:i===4?"Calculando":"Finalizado"})),cumulative:[24.9,49.8,74.7,99.6]};
const leagues=[{id:"demo",competitionSeasonId:"season",name:"Los del viernes",leagueCode:"CNST-TEST01",version:1,memberLimit:12,competitionSeason:{competition:{name:"Primera Provincial"}},memberships:[{id:"m1",role:"OWNER",userProfile:{authUserId:"demo",username:"pepe",displayName:"Pepe"}}],currentRound:4,rules:{budgetCredits:30000000,rosterSize:7,starterCount:5,substituteCount:2,maxPerRealTeam:2}}];
const seasons=[{id:"season",label:"Primera Provincial Senior Masculina de Sevilla · 2026/27"}];
const items=[["/app","Inicio","home"],["/app/mercado","Mercado","market"],["/app/mi-equipo","Mi equipo","team"],["/app/jornada","Jornada","calendar"],["/app/ligas","Liga","league"]];
function Shell({children}:{children:ReactNode}){return <div className="app-frame"><aside className="side-nav"><a className="wordmark" href="/app">Canastio</a><Navigation items={items}/><div className="side-account"><AccountAvatar imageUrl={null} initial="P"/><span>@pepe</span></div><LogoutControl/></aside><div className="workspace"><div className="mobile-account"><a className="wordmark" href="/app">Canastio</a><AccountAvatar imageUrl={null} initial="P"/></div>{children}</div><Navigation items={items} mobile/></div>}
function Sports(){return <main className="app-main"><header className="workspace-header"><h1>Primera Provincial</h1></header><nav className="sports-tabs"><a href="#ranking">Clasificación</a><a href="#games">Calendario</a></nav><section className="data-section" id="ranking"><div className="section-heading"><h2>Clasificación</h2><span>Jornada 4</span></div><div className="data-table standings"><div className="data-row data-head"><span>#</span><span>Equipo</span><span>PJ</span><span>PG</span><span>PP</span><span>PTS</span></div>{roster.map((p,i)=><div className="data-row" key={i}><b>{i+1}</b><strong>{p.realTeamName}</strong><span>4</span><span>3</span><span>1</span><span>7</span></div>)}</div></section><section className="scoreboard" id="games"><time>Sábado, 12 de septiembre · 18:00</time><div><span>Club Baloncesto Ciudad de Sevilla</span><strong>72<i>:</i>68</strong><span>CB Coria</span></div><small>Finalizado</small></section><section className="data-section"><h2>Boxscore</h2><p className="no-boxscore">Sin estadísticas disponibles.</p></section></main>}
const key=new URLSearchParams(location.search).get("case")||"home";
async function boot(){let view:ReactNode;
 switch(key){
 case "register":view=<AuthForm mode="register" action={async()=>({status:"error",message:"El nombre de usuario ya está ocupado."})}/>;break;
 case "onboarding":view=<LeagueOnboarding seasons={seasons}/>;break;
 case "home":view=<HomeDashboard data={home}/>;break;
 case "market":view=<CanastioMarket players={players} updatedAt={now} market={{leagueId:"demo",leagueName:"Los del viernes",balanceCredits:9000000,clausesOpen:true,clauseCutoffAt:now,serverNow:now}}/>;break;
 case "team":view=<FantasyTeamManager initialTeam={team} competitionSeasonId="season" roundNumber={4}/>;break;
 case "journey":view=<JourneyLive data={journey}/>;break;
 case "league":view=<LeagueHub initialLeagues={leagues} seasons={seasons} authUserId="demo"/>;break;
 case "league-member":view=<LeagueHub initialLeagues={leagues.map(l=>({...l,memberships:l.memberships.map(m=>({...m,role:"MEMBER"}))}))} seasons={seasons} authUserId="demo"/>;break;
 case "profile":view=await ProfilePage();break;
 case "sports":view=<Sports/>;break;
 case "states":view=<main className="app-main"><header className="workspace-header"><h1>Sin conexión</h1></header><p className="form-message error" role="alert">No se pudo guardar. Comprueba tu conexión.</p><div className="data-section"><h2>Jornada pendiente</h2><p>No hay resultados publicados.</p><div className="loading-line"/><div className="loading-block"/></div><LogoutControl/></main>;break;
 default:view=<JourneyLive data={null}/>;
 }
 createRoot(document.getElementById("root")!).render(["register","onboarding"].includes(key)?view:<Shell>{view}</Shell>);
}
void boot();
