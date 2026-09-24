"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CatalogSyncButton({ categoryId, active }: { categoryId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sync() {
    if (!window.confirm("Se resincronizará esta competición completa. ¿Continuar?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ingestion/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "COMPETITION", target: { categoryId } }),
      });
      if (!response.ok) throw new Error("ENQUEUE_FAILED");
      const body = await response.json() as { data: { duplicate: boolean } };
      setMessage(body.data.duplicate ? "La sincronización ya estaba pendiente." : "Sincronización solicitada. El trabajo comenzará en cuanto lo tome el ingestor.");
      router.refresh();
    } catch {
      setMessage("No se pudo solicitar la sincronización. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return <div><button type="button" className="secondary-action" disabled={busy || active} onClick={() => void sync()}>{busy ? "Solicitando…" : active ? "Sincronización pendiente" : "Sincronizar ahora"}</button>{message ? <p role="status">{message}</p> : null}</div>;
}
