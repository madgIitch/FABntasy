"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CatalogFantasyButton({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (enabled) return <span>Fantasy habilitado</span>;
  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/ingestion/catalog/${id}/fantasy`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: { code?: string } };
        setMessage(body.error?.code === "SYNC_COMPETITION_FIRST" ? "Sincroniza primero los equipos de esta competición." : "No se pudo habilitar fantasy.");
        return;
      }
      setMessage("Fantasy habilitado. Se ha solicitado la sincronización de plantillas.");
      router.refresh();
    } catch {
      setMessage("No se pudo habilitar fantasy.");
    } finally {
      setBusy(false);
    }
  }
  return <div><button type="button" className="secondary-action" disabled={busy} onClick={() => void enable()}>{busy ? "Habilitando…" : "Habilitar fantasy"}</button>{message ? <p role="status">{message}</p> : null}</div>;
}
