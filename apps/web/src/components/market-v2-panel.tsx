"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { getMarketV2ForActor } from "../server/market-v2";
import styles from "./market-v2-panel.module.css";

type MarketV2View = Awaited<ReturnType<typeof getMarketV2ForActor>>;
type Player = { playerRegistrationId: string; displayName: string };
const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 6 });
const millions = (credits: number) => `${decimal.format(credits / 1_000_000)} M`;

export function marketPlayerName(name: string) {
  const [family, given] = name.split(",", 2);
  const ordered = given ? `${given.trim()} ${family.trim()}` : name.trim();
  return ordered.toLocaleLowerCase("es-ES").replace(/(^|[\s-])(\p{L})/gu, (_, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase("es-ES"))
    .replace(/\b(De|Del|La|Las|Los)\b/gu, word => word.toLocaleLowerCase("es-ES"));
}

export function MarketV2Panel({ v2, leagueId, players }: { v2: MarketV2View; leagueId: string; players: readonly Player[] }) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const names = new Map(players.map(player => [player.playerRegistrationId, marketPlayerName(player.displayName)]));
  if (!v2.active) return null;

  async function send(listingId: string, action: "BID" | "CANCEL") {
    if (pending) return;
    const listing = v2.listings.find(item => item.id === listingId);
    const amountCredits = Math.round(Number(amounts[listingId] ?? String((listing?.myBid?.amountCredits ?? listing?.referencePrice ?? 0) / 1_000_000)) * 1_000_000);
    if (action === "BID" && (!Number.isSafeInteger(amountCredits) || amountCredits <= 0)) { setMessage("Introduce una puja válida en millones."); return; }
    setPending(listingId); setMessage("");
    try {
      const response = await fetch("/api/fantasy/market/bids", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leagueId, listingId, action, amountCredits: action === "BID" ? amountCredits : undefined, idempotencyKey: crypto.randomUUID() }) });
      const body = await response.json() as { error?: { code?: string } };
      if (!response.ok) {
        const errors: Record<string, string> = { BIDDING_CLOSED: "El ciclo ya ha cerrado.", BID_BELOW_REFERENCE: "La puja debe igualar el precio mínimo.", INSUFFICIENT_BALANCE: "El saldo libre, descontando otras pujas, es insuficiente.", ROSTER_FULL: "No quedan huecos de plantilla disponibles.", REAL_TEAM_LIMIT: "Has alcanzado el límite de jugadores de ese equipo." };
        setMessage(errors[body.error?.code ?? ""] ?? "No se pudo guardar la puja.");
        return;
      }
      setMessage(action === "BID" ? "✓ Puja registrada" : "✓ Puja cancelada");
      router.refresh();
    } catch { setMessage("No se pudo conectar con el servidor."); }
    finally { setPending(null); }
  }

  const freeSlots = Math.max(0, v2.rosterSize - v2.rosterCount - v2.reservedSlots);
  return <section id="market-v2" className={styles.panel} aria-labelledby="market-v2-heading">
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Agentes libres · {v2.listings.length}</p>
        <h2 id="market-v2-heading">Pujas de hoy</h2>
        <p>{v2.cycle ? `Cierre: ${new Date(v2.cycle.closesAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Preparando el siguiente ciclo."} Las pujas rivales se revelan al cierre.</p>
      </div>
      <div className={styles.reserve}>
        <strong>{millions(v2.reservedCredits)}</strong>
        <span>en pujas</span>
        <small>{v2.reservedSlots} {v2.reservedSlots === 1 ? "puja realizada" : "pujas realizadas"} · {freeSlots === 0 ? "Plantilla completa" : `${freeSlots} huecos disponibles`}</small>
      </div>
    </header>
    {message && <p className={styles.message} role="status">{message}</p>}
    {v2.listings.length ? <ol className={styles.listings}>{v2.listings.map((item, index) => {
      const name = names.get(item.playerRegistrationId) ?? "Jugador";
      const hasBid = item.myBid?.status === "ACTIVE";
      return <li id={`market-v2-${item.playerRegistrationId}`} className={styles.listing} key={item.id}>
        <div className={styles.player}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{name}</strong><small>{millions(item.referencePrice)} mínimo</small></div></div>
        {hasBid && <p className={styles.ownBid}>Tu puja · {millions(item.myBid!.amountCredits)}</p>}
        <div className={styles.bidControls}>
          <label><span className={styles.srOnly}>Puja por {name} en millones</span><input type="number" inputMode="decimal" min={item.referencePrice / 1_000_000} step="0.000001" value={amounts[item.id] ?? String((item.myBid?.amountCredits ?? item.referencePrice) / 1_000_000)} onChange={event => setAmounts(current => ({ ...current, [item.id]: event.target.value }))}/><span className={styles.unit} aria-hidden="true">M</span></label>
          <button type="button" className={styles.bidButton} disabled={pending !== null} onClick={() => void send(item.id, "BID")}>{hasBid ? "Editar puja" : "Pujar"}</button>
          {hasBid && <button className={styles.cancelButton} type="button" disabled={pending !== null} onClick={() => void send(item.id, "CANCEL")}>Cancelar</button>}
        </div>
      </li>;
    })}</ol> : <p className={styles.empty}>No hay agentes libres en este ciclo.</p>}
    {v2.history.length > 0 && <details className={styles.history}><summary>Resultados anteriores</summary><ol>{v2.history.map((item, index) => <li key={`${item.playerRegistrationId}-${index}`}><div><strong>{names.get(item.playerRegistrationId) ?? "Jugador"}</strong><span>{item.result === "WON" ? "Adjudicado" : item.result ? "No adjudicado" : "Ciclo cerrado"}</span></div><p>{item.winner ? `Ganador: ${item.winner} · ${millions(item.winningPrice)}.` : "Sin adjudicar."}</p>{item.bids.length > 0 && <details><summary>Ver pujas cerradas</summary><ul>{item.bids.map((bid, bidIndex) => <li key={bidIndex}>{bid.manager}: {millions(bid.amountCredits)}{bid.status === "WON" ? " · ganador" : ""}</li>)}</ul></details>}</li>)}</ol></details>}
  </section>;
}
