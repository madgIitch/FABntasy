"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { getMarketNegotiationsForActor, NegotiationInput } from "../server/market-negotiations";
import type { MarketPlayer } from "./canastio-market";
import styles from "./market-negotiations-panel.module.css";

type Data = Awaited<ReturnType<typeof getMarketNegotiationsForActor>>;
type Action = NegotiationInput["action"];
const money = new Intl.NumberFormat("es-ES");
const statusLabel: Record<string, string> = { OPEN: "Abierta", ACCEPTED: "Aceptada", REJECTED: "Rechazada", EXPIRED: "Caducada", INVALID: "Ya no disponible" };
const errors: Record<string, string> = {
  INSUFFICIENT_BALANCE: "Saldo insuficiente para esta oferta.", ROSTER_FULL: "No tienes hueco en la plantilla.", REAL_TEAM_LIMIT: "Has alcanzado el límite de ese equipo.", QUOTE_CHANGED: "El precio ha cambiado. Revisa la nueva cifra antes de confirmar.", OWNER_CHANGED: "El jugador ha cambiado de equipo.", OFFER_EXPIRED: "La oferta ha caducado.", SYSTEM_OFFER_EXPIRED: "La oferta de Canastio ha caducado.", IDEMPOTENCY_CONFLICT: "La operación ya se ha procesado con otros datos.",
};

export function MarketNegotiationsPanel({ data, players, leagueId }: { data: Data; players: readonly MarketPlayer[]; leagueId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const name = new Map(players.map(player => [player.playerRegistrationId, player.displayName]));
  const origin = new Map(players.map(player => [player.playerRegistrationId, `${player.realTeamName} · ${player.competitionName}`]));
  const listing = new Map(data.listings.map(item => [item.playerRegistrationId, item]));
  const quote = new Map(data.instantQuotes.map(item => [item.playerRegistrationId, item.amountCredits]));
  function amount(key: string, fallback: number) { return amounts[key] ?? String(fallback / 1_000_000); }
  function readAmount(key: string, fallback: number) { const value = Number(amount(key, fallback)) * 1_000_000; return Number.isSafeInteger(value) && value > 0 ? value : null; }
  async function submit(action: Action, fields: Omit<NegotiationInput, "action" | "leagueId" | "idempotencyKey">) {
    setError(""); setNotice(""); setBusy(true);
    try {
      const response = await fetch("/api/fantasy/market/negotiations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, leagueId, idempotencyKey: crypto.randomUUID(), ...fields }) });
      const body = await response.json();
      if (!response.ok) { const code = body.error?.code; setError(code === "QUOTE_CHANGED" && Number.isSafeInteger(body.error?.details?.quoteCredits) ? `La nueva cotización es ${money.format(body.error.details.quoteCredits)} créditos. Confirma de nuevo si quieres vender.` : errors[code] ?? `No se pudo completar la operación (${code ?? response.status}).`); if (code === "QUOTE_CHANGED") router.refresh(); return; }
      setNotice("Operación confirmada."); router.refresh();
    } catch { setError("No se pudo conectar. Comprueba tu conexión antes de repetir la operación."); }
    finally { setBusy(false); }
  }
  function sendAmount(action: Action, key: string, fallback: number, fields: Omit<NegotiationInput, "action" | "leagueId" | "idempotencyKey" | "amountCredits">) {
    const amountCredits = readAmount(key, fallback);
    if (amountCredits === null) { setError("Introduce un importe válido en millones."); return; }
    void submit(action, { ...fields, amountCredits });
  }
  return <section className={styles.panel} aria-label="Traspasos entre managers">
    <header><h2>Traspasos</h2><p>Negocia en privado con otros managers o pon jugadores en venta. Las ofertas duran 48 horas y el anuncio, 72 horas. Canastio ofrecerá el valor de mercado en el siguiente ciclo diario.</p></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}
    <label className={styles.search}>Buscar jugador para negociar<input value={playerQuery} onChange={event => setPlayerQuery(event.target.value)} placeholder="Nombre del jugador" /></label>
    <div className={styles.grid}>
      {players.filter(player => player.owner && (player.owner.isMine || listing.has(player.playerRegistrationId) || (playerQuery.trim().length >= 2 && player.displayName.toLocaleLowerCase("es").includes(playerQuery.trim().toLocaleLowerCase("es"))))).map(player => {
        const mine = player.owner!.isMine; const listed = listing.get(player.playerRegistrationId); const saleQuote = quote.get(player.playerRegistrationId); const key = player.playerRegistrationId;
        return <article className={styles.player} key={key}><div><strong>{player.displayName}</strong><small>{player.realTeamName} · {player.competitionName}</small><small>{mine ? "Tu plantilla" : player.owner!.ownerName}{listed ? ` · En venta hasta ${new Date(listed.expiresAt).toLocaleString("es-ES")}` : ""}</small></div>
          {mine ? <div className={styles.actions}>
            {listed ? <><button disabled={busy} onClick={() => void submit("UNLIST", { listingId: listed.id })}>Retirar anuncio</button>{listed.systemOffer && <button disabled={busy} onClick={() => void submit("ACCEPT_SYSTEM", { systemOfferId: listed.systemOffer!.id })}>Aceptar Canastio · {money.format(listed.systemOffer.amountCredits)}</button>}</> : <><label>Precio deseado, opcional · M<input type="number" min="0.01" step="0.01" value={amounts[key] ?? ""} onChange={event => setAmounts({ ...amounts, [key]: event.target.value })} placeholder="Sin precio" /></label><button disabled={busy} onClick={() => { const value = amounts[key]?.trim(); const desiredPriceCredits = value ? readAmount(key, 0) : null; if (value && desiredPriceCredits === null) { setError("Introduce un precio válido."); return; } void submit("LIST", { playerRegistrationId: key, desiredPriceCredits }); }}>Poner en venta</button></>}
            <button disabled={busy} onClick={() => { if (saleQuote !== undefined && window.confirm(`Venta inmediata por ${money.format(saleQuote)} créditos (80 % del valor actual). ¿Confirmas?`)) void submit("INSTANT_SELL", { playerRegistrationId: key, expectedQuoteCredits: saleQuote }); }}>Venta inmediata · {money.format(saleQuote ?? 0)}</button>
          </div> : <div className={styles.actions}><label>Oferta privada · M<input type="number" min="0.01" step="0.01" value={amount(key, listed?.desiredPriceCredits ?? player.currentPrice)} onChange={event => setAmounts({ ...amounts, [key]: event.target.value })} /></label><button disabled={busy} onClick={() => sendAmount("OFFER", key, listed?.desiredPriceCredits ?? player.currentPrice, { playerRegistrationId: key })}>Hacer oferta</button>{listed?.desiredPriceCredits && <small>Precio deseado: {money.format(listed.desiredPriceCredits)} · orientativo</small>}</div>}
        </article>;
      })}
    </div>
    <h3>Mis negociaciones</h3>{data.threads.length === 0 ? <p>Aún no tienes ofertas privadas.</p> : <ol className={styles.threads}>{data.threads.map(thread => { const current = thread.proposals.find(proposal => proposal.status === "ACTIVE"); const recipient = current && current.proposerTeamId !== data.teamId; return <li key={thread.id}><strong>{name.get(thread.playerRegistrationId) ?? "Jugador"}</strong>{origin.has(thread.playerRegistrationId) && <small>{origin.get(thread.playerRegistrationId)}</small>}<span>{thread.buyer} → {thread.seller} · {statusLabel[thread.status] ?? thread.status}</span>{current && <><span>{money.format(current.amountCredits)} créditos · hasta {new Date(current.expiresAt).toLocaleString("es-ES")}</span>{recipient && <div className={styles.actions}><button disabled={busy} onClick={() => void submit("ACCEPT", { threadId: thread.id })}>Aceptar</button><button disabled={busy} onClick={() => void submit("REJECT", { threadId: thread.id })}>Rechazar</button><label>Contraoferta · M<input type="number" min="0.01" step="0.01" value={amount(thread.id, current.amountCredits)} onChange={event => setAmounts({ ...amounts, [thread.id]: event.target.value })} /></label><button disabled={busy} onClick={() => sendAmount("COUNTER", thread.id, current.amountCredits, { threadId: thread.id })}>Enviar contraoferta</button></div>}</>}</li>; })}</ol>}
  </section>;
}
