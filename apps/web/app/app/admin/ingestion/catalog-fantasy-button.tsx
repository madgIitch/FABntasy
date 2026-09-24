"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { id: string; categoryId: string; name: string; activeLeagueCount: number; enabled: boolean };

export function CatalogFantasyButton({ id, categoryId, name, activeLeagueCount, enabled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    if (enabled && !window.confirm(
      "¿Deshabilitar Fantasy para " + name + " (FAB " + categoryId + ")? " +
      activeLeagueCount + " ligas quedarán suspendidas. Se conservarán sus plantillas e historial.",
    )) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ingestion/catalog/" + id + "/fantasy", enabled
        ? { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: categoryId }) }
        : { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: { code?: string } };
        setMessage(body.error?.code === "SYNC_COMPETITION_FIRST"
          ? "Sincroniza primero los equipos de esta competición."
          : "No se pudo cambiar el estado de Fantasy.");
        return;
      }
      setMessage(enabled
        ? "Fantasy deshabilitado. Las ligas afectadas han quedado suspendidas."
        : "Fantasy habilitado. Se ha solicitado la sincronización de plantillas.");
      router.refresh();
    } catch {
      setMessage("No se pudo cambiar el estado de Fantasy.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    {enabled ? <p>Fantasy habilitado · {activeLeagueCount} ligas activas</p> : null}
    <button type="button" className="secondary-action" disabled={busy} onClick={() => void toggle()}>
      {busy ? "Actualizando…" : enabled ? "Deshabilitar fantasy" : "Habilitar fantasy"}
    </button>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
