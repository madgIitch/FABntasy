"use client";
import { useState } from "react";

export function MarketV2Control({ initialState }: { initialState: { active: boolean; startedAt: string | null } }) {
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function start() {
    if (!window.confirm("Iniciar el mercado de pujas para todas las ligas Fantasy existentes y futuras. El primer ciclo cerrará a medianoche. ¿Continuar?")) return;
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/admin/market-v2", { method: "POST" });
      const body = await response.json() as { data?: { active: boolean; startedAt: string }; error?: string };
      if (!response.ok || !body.data) { setMessage("No se pudo iniciar el mercado. Vuelve a intentarlo."); return; }
      setState(body.data); setMessage("El mercado de pujas ya está activo para todas las ligas Fantasy.");
    } catch { setMessage("No se pudo conectar con el servidor."); }
    finally { setPending(false); }
  }
  return <section className="profile-group rollout-control" aria-labelledby="market-v2-title"><div><p className="eyebrow">Mercado Fantasy</p><h2 id="market-v2-title">{state.active ? "Pujas activas" : "Compras directas"}</h2><p>{state.active ? `El mercado global se inició el ${new Date(state.startedAt!).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}. Cada liga tiene ciclos diarios.` : "Al iniciarlo, todas las ligas Fantasy actuales y futuras usarán pujas por jugadores libres."}</p></div>{!state.active && <button className="primary-action" type="button" onClick={start} disabled={pending}>{pending ? "Iniciando…" : "Iniciar mercado"}</button>}{message && <p className="settings-status" role="status">{message}</p>}</section>;
}
