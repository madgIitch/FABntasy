"use client";

import { useState } from "react";

export function InviteJoin({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function join() {
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/fantasy/leagues/invite/${token}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error?.code === "LEAGUE_FULL" ? "La liga ya está llena." : body.error?.code === "COMPETITION_DISABLED" ? "La liga no admite nuevas incorporaciones ahora." : "No se pudo usar la invitación. Solicita un enlace nuevo."); return; }
      const leagueId = body.data?.id;
      if (leagueId) await fetch("/api/fantasy/leagues/active", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leagueId }) });
      location.assign(leagueId ? `/app/ligas/${leagueId}` : "/app/ligas");
    } catch { setMessage("Sin conexión. Vuelve a intentarlo."); }
    finally { setPending(false); }
  }
  return <><p>Al confirmar entrarás en esta liga.</p><button className="primary-action" type="button" disabled={pending} onClick={() => void join()}>{pending ? "Uniéndote…" : "Unirme a esta liga"}</button>{message ? <p role="alert">{message}</p> : null}</>;
}
