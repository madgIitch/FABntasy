"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CatalogMonitorButton({ id, monitored }: { id: string; monitored: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function toggle() { setBusy(true); try { const response = await fetch(`/api/admin/ingestion/catalog/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ monitored: !monitored }) }); if (response.ok) router.refresh(); } finally { setBusy(false); } }
  return <button type="button" className="secondary-action" disabled={busy} onClick={() => void toggle()}>{busy ? "Guardando…" : monitored ? "Dejar de seguir" : "Monitorizar"}</button>;
}
