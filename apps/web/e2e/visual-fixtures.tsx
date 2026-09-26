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
import { InviteJoin } from "../src/components/invite-join";
import { Navigation } from "../src/components/ui/navigation";
import { AccountAvatar, LogoutControl } from "../app/app/account-controls";
import { AuthForm } from "../app/auth/auth-form";
import ProfilePage from "../app/app/perfil/page";
import { AppearanceSettings } from "../app/app/perfil/appearance-settings";
import IngestionAdminPage from "../app/app/admin/ingestion/page";
import CorrectionsPage from "../app/app/admin/correcciones/page";
import "../app/globals.css";

const names = ["Pablo Rodríguez Fernández", "Javier Martín", "Álvaro García", "Manuel Sánchez", "Daniel López", "Antonio Ruiz", "Carlos Medina"];
const roster = names.map((displayName,i)=>({playerRegistrationId:String(i),displayName,realTeamName:i%2?"CB Coria":"Club Baloncesto Ciudad de Sevilla",acquisitionPrice:3000000,currentMarketPrice:3450000}));
const team = {version:1,budgetTotal:30000000,budgetUsed:21000000,budgetRemaining:9000000,roster,lineup:{status:"DRAFT",cutoffAt:"2026-12-01T18:00:00Z",starters:roster.slice(0,5),substitutes:roster.slice(5)}};
const players: ComponentProps<typeof CanastioMarket>["players"] = roster.map((p,i)=>({...p,playerId:String(i),competitionName:"Primera Provincial",currentPrice:3450000,previousPrice:3000000,changeCredits:450000,changePercent:i%2?-4.5:15,trend:i%2?"DOWN":"UP",allTimeHigh:4000000,allTimeLow:3000000,averageFantasyPoints:22.5,recentFantasyPoints:[20,25,22],owner:i===1?{ownerName:"Pepe",isMine:true,acquisitionPrice:3000000,clauseInvestment:0,protection:null}:null,clauseCredits:5000000}));
const now="2026-09-07T14:00:00Z";
type ReadyHome=Extract<ComponentProps<typeof HomeDashboard>["data"],{kind:"READY"}>;
const home:ReadyHome={kind:"READY",schemaVersion:"canastio.home.v1",mode:"DEFAULT",updatedAt:now,displayName:"Pepe",league:{id:"demo",name:"Los del viernes"},leagues:[{id:"demo",name:"Los del viernes"}],competition:"Primera Provincial",roster:{count:7,balanceCredits:9000000},round:{number:4,cutoffAt:"2026-09-12T16:00:00Z",lineupState:"INCOMPLETE",isLive:false},performance:{state:"READY",updatedAt:now,data:{roundNumber:3,points:"124.5",position:2,positionChange:1}},market:{state:"READY",updatedAt:now,data:roster.slice(0,3).map(p=>({id:p.playerRegistrationId,name:p.displayName,price:3450000,change:450000,percentage:15,period:"Jornada 3"}))},games:{state:"READY",updatedAt:now,data:[{id:"g1",home:"CB Coria",away:"Ciudad de Sevilla",scheduledAt:"2026-09-12T16:00:00Z",status:"Programado"}]},playedGames:{state:"READY",updatedAt:now,data:[{id:"g0",home:"CB Fresas - SAFA Reyes Sevilla",away:"Club Náutico Sevilla",homeScore:81,awayScore:75,scheduledAt:"2026-09-11T18:00:00Z"}]},activity:{state:"READY",updatedAt:now,data:[{id:"a1",type:"BUY",manager:"Pepe",player:"Javier Martín",price:3000000,createdAt:now}]}};
const homeLive:ReadyHome={...home,mode:"LIVE",round:{...home.round,isLive:true,lineupState:"LOCKED"},performance:{...home.performance,data:null}};
const homeFinal:ReadyHome={...home,mode:"RECENT_FINAL",round:{...home.round,lineupState:"LOCKED"}};
const homeDegraded:ReadyHome={...home,market:{state:"EMPTY",updatedAt:now,data:[]},games:{state:"ERROR",updatedAt:null,data:[]},activity:{state:"READY",updatedAt:now,data:[...Array(6)].map((_,i)=>({id:`long-${i}`,type:"BUY",manager:"@manager_con_un_nombre_muy_largo",player:"GARCÍA-TREVIJANO DE LOS RÍOS, GUILLERMO-ALEJANDRO",price:5000000,createdAt:now}))}};
const journey: ComponentProps<typeof JourneyLive>["data"]={competition:"Primera Provincial",league:"Los del viernes",roundNumber:4,rounds:[4,3,2,1],state:"PROVISIONAL",stateLabel:"Calculando",totalPoints:"124.5",revision:1,correction:null,players:roster.slice(0,5).map((p,i)=>({id:p.playerRegistrationId,name:p.displayName,fantasyPoints:i===4?null:"24.9",points:12,assists:3,steals:1,state:i===4?"PENDING":"FINAL",stateLabel:i===4?"Calculando":"Finalizado",statsState:i===4?"PARTIAL":"FINAL",statsUpdatedAt:now})),cumulative:[24.9,49.8,74.7,99.6]};
const leagues=[{id:"demo",competitionSeasonId:"season",name:"Los del viernes",version:1,memberLimit:12,competitionSeason:{competition:{name:"Primera Provincial"}},memberships:[{id:"m1",role:"OWNER",userProfile:{authUserId:"demo",username:"pepe",displayName:"Pepe"}}],currentRound:4,rules:{budgetCredits:30000000,rosterSize:7,starterCount:5,substituteCount:2,maxPerRealTeam:2}}];
const seasons=[{id:"season",label:"Primera Provincial Senior Masculina de Sevilla · 2026/27"}];
const items=[["/app","Inicio","home"],["/app/mercado","Mercado","market"],["/app/mi-equipo","Mi equipo","team"],["/app/jornada","Jornada","calendar"],["/app/ligas","Liga","league"]];
function Shell({children}:{children:ReactNode}){return <div className="app-frame"><aside className="side-nav"><a className="wordmark" href="/app">Canastio</a><Navigation items={items}/><div className="side-account"><AccountAvatar imageUrl={null} initial="P"/><span>@pepe</span></div><LogoutControl/></aside><div className="workspace"><div className="mobile-account"><a className="wordmark" href="/app">Canastio</a><AccountAvatar imageUrl={null} initial="P"/></div>{children}</div><div className="mobile-navigation-shell"><Navigation items={items} mobile/></div></div>}
function Sports(){return <main className="app-main"><header className="workspace-header"><h1>Primera Provincial</h1></header><nav className="sports-tabs"><a href="#ranking">Clasificación</a><a href="#games">Calendario</a></nav><section className="data-section" id="ranking"><div className="section-heading"><h2>Clasificación</h2><span>Jornada 4</span></div><div className="data-table standings"><div className="data-row data-head"><span>#</span><span>Equipo</span><span>PJ</span><span>PG</span><span>PP</span><span>PTS</span></div>{roster.map((p,i)=><div className="data-row" key={i}><b>{i+1}</b><strong>{p.realTeamName}</strong><span>4</span><span>3</span><span>1</span><span>7</span></div>)}</div></section><section className="scoreboard" id="games"><time>Sábado, 12 de septiembre · 18:00</time><div><span>Club Baloncesto Ciudad de Sevilla</span><strong>72<i>:</i>68</strong><span>CB Coria</span></div><small>Finalizado</small></section><section className="data-section"><h2>Boxscore</h2><p className="no-boxscore">Sin estadísticas disponibles.</p></section></main>}
const key=new URLSearchParams(location.search).get("case")||"home";
async function boot(){let view:ReactNode;
 switch(key){
 case "register":view=<AuthForm mode="register" action={async()=>({status:"error",message:"El nombre de usuario ya está ocupado."})}/>;break;
 case "invite-login":view=<AuthForm mode="login" next="/liga/AbCdEfGhIjKlMnOpQrStUv" action={async()=>({status:"error",message:"Comprueba tus datos."})}/>;break;
 case "invite-register":view=<AuthForm mode="register" next="/liga/AbCdEfGhIjKlMnOpQrStUv" action={async()=>({status:"error",message:"Comprueba tus datos."})}/>;break;
 case "invite":view=<main className="auth-page"><section className="auth-panel"><p className="eyebrow">Invitación a una liga</p><h1>Los del viernes</h1><p>Primera Provincial · 1 de 20 managers</p><InviteJoin token="AbCdEfGhIjKlMnOpQrStUv" /></section></main>;break;
 case "preferences":view=<main className="app-main profile-page"><AppearanceSettings compact /></main>;break;
 case "onboarding":view=<LeagueOnboarding seasons={seasons}/>;break;
 case "home":view=<HomeDashboard data={home}/>;break;
 case "home-live":view=<HomeDashboard data={homeLive}/>;break;
 case "home-final":view=<HomeDashboard data={homeFinal}/>;break;
 case "home-degraded":view=<HomeDashboard data={homeDegraded}/>;break;
 case "market":view=<CanastioMarket players={players} updatedAt={now} market={{leagueId:"demo",leagueName:"Los del viernes",balanceCredits:9000000,clausesOpen:true,clauseCutoffAt:now,serverNow:now}}/>;break;
 case "market-explore":view=<CanastioMarket view="explore" players={players} updatedAt={now} negotiations={{teamId:"team-1",reservedOfferCredits:0,listings:[{id:"transfer-listing",playerRegistrationId:players[1].playerRegistrationId,sellerTeamId:"team-1",seller:"pepe",desiredPriceCredits:5000000,expiresAt:"2026-09-08T22:00:00Z",mine:true,systemOffer:{id:"system-offer",amountCredits:3450000,expiresAt:"2026-09-08T22:00:00Z"}}],threads:[{id:"thread",playerRegistrationId:players[1].playerRegistrationId,buyerTeamId:"team-2",sellerTeamId:"team-1",status:"OPEN",buyer:"ana",seller:"pepe",proposals:[{id:"proposal",proposerTeamId:"team-2",amountCredits:4000000,status:"ACTIVE",expiresAt:"2026-09-08T22:00:00Z"}]}],instantQuotes:[{playerRegistrationId:players[1].playerRegistrationId,amountCredits:2760000}]}} marketV2={{active:true,cycle:{id:"cycle",opensAt:now,closesAt:"2026-09-08T22:00:00Z"},reservedCredits:0,reservedSlots:0,reservedOfferCredits:0,reservedOfferSlots:0,rosterCount:1,rosterSize:8,listings:[{id:"listing-0",playerRegistrationId:players[0].playerRegistrationId,referencePrice:3450000,myBid:null}],history:[]}} market={{leagueId:"demo",leagueName:"Los del viernes",balanceCredits:9000000,clausesOpen:true,clauseCutoffAt:now,serverNow:now}}/>;break;
 case "market-v2":view=<CanastioMarket players={players.map((player,index)=>index===0?{...player,displayName:"RODRÍGUEZ FERNÁNDEZ, PABLO"}:player)} updatedAt={now} marketV2={{active:true,cycle:{id:"cycle",opensAt:now,closesAt:"2026-09-08T22:00:00Z"},reservedCredits:5000000,reservedSlots:1,reservedOfferCredits:0,reservedOfferSlots:0,rosterCount:1,rosterSize:8,listings:players.filter(player=>!player.owner).slice(0,3).map((player,index)=>({id:`listing-${index}`,playerRegistrationId:player.playerRegistrationId,referencePrice:3450000,myBid:index===0?{amountCredits:5000000,status:"ACTIVE"}:null})),history:[{playerRegistrationId:players[3].playerRegistrationId,result:"LOST",winner:"pepe",winningPrice:5300000,bids:[{manager:"pepe",amountCredits:5300000,status:"WON"},{manager:"ana",amountCredits:5000000,status:"LOST"}]}]}} market={{leagueId:"demo",leagueName:"Los del viernes",balanceCredits:9000000,clausesOpen:true,clauseCutoffAt:now,serverNow:now}}/>;break;
 case "team":view=<FantasyTeamManager initialTeam={team} competitionSeasonId="season" roundNumber={4}/>;break;
 case "journey":view=<JourneyLive data={journey}/>;break;
 case "league":view=<LeagueHub initialLeagues={leagues} authUserId="demo"/>;break;
 case "league-member":view=<LeagueHub initialLeagues={leagues.map(l=>({...l,memberships:l.memberships.map(m=>({...m,role:"MEMBER"}))}))} authUserId="demo"/>;break;
 case "profile":view=await ProfilePage({searchParams:Promise.resolve({})});break;
 case "admin":view=await IngestionAdminPage({searchParams:Promise.resolve({})});break;
 case "corrections":view=await CorrectionsPage();break;
 case "sports":view=<Sports/>;break;
 case "states":view=<main className="app-main"><header className="workspace-header"><h1>Sin conexión</h1></header><p className="form-message error" role="alert">No se pudo guardar. Comprueba tu conexión.</p><div className="data-section"><h2>Jornada pendiente</h2><p>No hay resultados publicados.</p><div className="loading-line"/><div className="loading-block"/></div><LogoutControl/></main>;break;
 default:view=<JourneyLive data={null}/>;
 }
 createRoot(document.getElementById("root")!).render(["register","onboarding","invite","invite-login","invite-register"].includes(key)?view:<Shell>{view}</Shell>);
}
void boot();
