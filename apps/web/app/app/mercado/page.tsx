import Link from "next/link";
import { PLAYER_PRICING_V1 } from "../../../../../packages/domain/player-pricing";
import { CanastioMarket } from "../../../src/components/canastio-market";
import { db } from "../../../src/server/db";
import { getMarketContext, MarketServiceError } from "../../../src/server/fantasy-market";
import { getPlayerPrices } from "../../../src/server/player-pricing";
import { requireLeagueActor } from "../../../src/server/private-league-http";
import { listLeagues } from "../../../src/server/private-leagues";

export default async function MarketPage({searchParams}:{searchParams:Promise<{league?:string}>}) {
  const actor=await requireLeagueActor(); const leagues=await listLeagues(actor); const query=await searchParams;
  if(!leagues.length)return <main className="app-main"><section className="empty-state"><span aria-hidden="true">⇅</span><h1>Mercado de liga</h1><p>Necesitas pertenecer a una liga para comprar, vender o clausular jugadores.</p><Link className="primary-action" href="/app/ligas">Crear o unirme <span>→</span></Link></section></main>;
  const league=leagues.find(item=>item.id===query.league)??leagues[0];
  let market;try{market=await getMarketContext(actor,league.id)}catch(error){if(error instanceof MarketServiceError&&error.code==="TEAM_NOT_FOUND")return <main className="app-main"><section className="empty-state"><span aria-hidden="true">◉</span><h1>Crea tu equipo</h1><p>Configura primero tu plantilla dentro de {league.name} para activar el saldo y el mercado.</p><Link className="primary-action" href="/app/mi-equipo">Ir a Mi equipo <span>→</span></Link></section></main>;throw error;}
  const season=league.competitionSeason; const [prices,registrations]=await Promise.all([getPlayerPrices({competitionSeasonId:league.competitionSeasonId}),db.playerRegistration.findMany({where:{competitionSeasonId:league.competitionSeasonId},orderBy:{player:{displayName:"asc"}},include:{player:true,teamRegistration:{include:{team:true}},stats:{include:{game:true,fantasyScores:{where:{ruleSet:{status:"ACTIVE"}},orderBy:{createdAt:"desc"},take:1}}}}})]);
  const priceByRegistration=new Map(prices.map(price=>[price.playerRegistrationId,price]));const ownerByRegistration=new Map(market.ownership.map(owner=>[owner.playerRegistrationId,owner]));const competitionName=season.competition.name;
  const players=registrations.map(registration=>{const stored=priceByRegistration.get(registration.id);const owner=ownerByRegistration.get(registration.id);const scores=registration.stats.filter(stat=>stat.fantasyScores[0]?.status==="CALCULATED"&&stat.fantasyScores[0].normalizedFantasyPoints!==null).sort((a,b)=>(b.game.roundNumber??0)-(a.game.roundNumber??0)).map(stat=>Number(stat.fantasyScores[0].normalizedFantasyPoints));const base=stored?.currentPrice??PLAYER_PRICING_V1.initialPrice;return {...(stored??{playerRegistrationId:registration.id,playerId:registration.playerId,displayName:registration.player.displayName,realTeamName:registration.teamRegistration.team.name,currentPrice:base,previousPrice:null,changeCredits:0,changePercent:null,trend:"FLAT" as const,allTimeHigh:base,allTimeLow:base}),competitionName,averageFantasyPoints:scores.length?scores.reduce((sum,score)=>sum+score,0)/scores.length:null,recentFantasyPoints:scores.slice(0,3),owner:owner??null,clauseCredits:owner?Math.round(Math.max(owner.acquisitionPrice,base)*1.75)+owner.clauseInvestment:null};});
  return <CanastioMarket players={players} updatedAt={prices[0]?.updatedAt} market={{leagueId:league.id,leagueName:league.name,balanceCredits:market.balanceCredits,clausesOpen:market.clausesOpen,clauseCutoffAt:market.clauseCutoffAt}}/>;
}
