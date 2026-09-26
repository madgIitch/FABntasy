"use client";

import { useEffect, useState } from "react";
import styles from "./league-detail.module.css";
import { Dialog } from "./ui/dialog";

export function LeagueDetailActions({ leagueId, isOwner, showInvitation = true, compact = false }: { leagueId: string; isOwner: boolean; showInvitation?: boolean; compact?: boolean }) {
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [action, setAction] = useState<"idle" | "copying" | "saving" | "leaving">("idle");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  useEffect(() => {
    if (!isOwner || !showInvitation) return;
    let current = true;
    void fetch(`/api/fantasy/leagues/${leagueId}/invites`, { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (current && response.ok && body.data?.token) setLink(`${location.origin}/liga/${body.data.token}`);
      else if (current) setMessage("No se pudo cargar el enlace de invitación.");
    }).catch(() => { if (current) setMessage("Sin conexión. No se pudo cargar el enlace."); });
    return () => { current = false; };
  }, [leagueId, isOwner, showInvitation]);

  async function copyLink() {
    setAction("copying"); setMessage("");
    try { await navigator.clipboard.writeText(link); setMessage("Enlace copiado. Ya puedes compartirlo."); }
    catch { setMessage("No se pudo copiar. Selecciona el enlace para compartirlo."); }
    finally { setAction("idle"); }
  }
  async function shareLink() {
    if (!navigator.share) return copyLink();
    try { await navigator.share({ title: "Invitación a mi liga de Canastio", url: link }); }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; setMessage("No se pudo compartir. Prueba a copiar el enlace."); }
  }
  async function regenerate() {
    setAction("saving"); setMessage("");
    try {
      const response = await fetch(`/api/fantasy/leagues/${leagueId}/invites`, { method: "POST" });
      const body = await response.json();
      if (!response.ok || !body.data?.token) { setMessage("No se pudo regenerar el enlace."); return; }
      setLink(`${location.origin}/liga/${body.data.token}`);
      setMessage("Enlace anterior invalidado. Comparte el nuevo enlace.");
    } catch { setMessage("Sin conexión. No se ha regenerado el enlace."); }
    finally { setAction("idle"); setConfirmRegenerate(false); }
  }
  async function leave() {
    setAction("leaving"); setMessage("");
    try {
      const response = await fetch(`/api/fantasy/leagues/${leagueId}/leave`, { method: "POST" });
      if (response.ok) location.href = "/app/ligas";
      else setMessage((await response.json()).error?.code ?? "No se pudo abandonar la liga.");
    } catch { setMessage("Sin conexión. Sigues dentro de la liga."); }
    finally { setAction("idle"); setConfirmLeave(false); }
  }

  return <section className={`${styles.access} ${compact ? styles.compact : ""}`} aria-labelledby={compact ? undefined : "league-access-title"} aria-label={compact ? "Opciones de invitación" : undefined}>
    {!compact ? <div className={styles.intro}><div className={styles.introHeading}><p className={styles.eyebrow}>Acceso</p><h3 className={styles.title} id="league-access-title">{isOwner ? "Invita a tu liga" : "Tu participación"}</h3></div><p className={styles.introHint}>{isOwner ? "Comparte este enlace para que otras personas puedan unirse." : "Gestiona tu pertenencia a esta liga."}</p></div> : <p>Comparte este enlace para que otras personas puedan unirse.</p>}
    {isOwner && showInvitation ? <>
      <div className={styles.codeRow}><div className={styles.codeBlock}><span className={styles.fieldLabel}>Enlace de invitación</span><input className={styles.passwordInput} aria-label="Enlace de invitación" readOnly value={link} placeholder="Cargando enlace…" onFocus={event => event.target.select()} /></div><button className={styles.copyButton} type="button" disabled={!link || action !== "idle"} onClick={() => void copyLink()}>Copiar enlace</button></div>
      <button className={styles.saveButton} type="button" disabled={!link || action !== "idle"} onClick={() => void shareLink()}>Compartir enlace</button>
      <button className={styles.saveButton} type="button" disabled={action !== "idle"} onClick={() => setConfirmRegenerate(true)}>Regenerar enlace</button>
      <Dialog open={confirmRegenerate} title="¿Regenerar el enlace?" onClose={() => setConfirmRegenerate(false)}><p>El enlace anterior dejará de funcionar. Los miembros actuales seguirán en la liga.</p><div><button type="button" onClick={() => setConfirmRegenerate(false)}>Cancelar</button><button className="primary-action" type="button" disabled={action === "saving"} onClick={() => void regenerate()}>{action === "saving" ? "Regenerando…" : "Regenerar"}</button></div></Dialog>
    </> : null}
    {!isOwner ? <button className={styles.leaveButton} type="button" disabled={action !== "idle"} onClick={() => setConfirmLeave(true)}>{action === "leaving" ? "Saliendo…" : "Abandonar liga"}</button> : null}
    <Dialog open={confirmLeave} title="¿Abandonar esta liga?" onClose={() => setConfirmLeave(false)}><p>Dejarás de participar en esta liga.</p><div><button type="button" onClick={() => setConfirmLeave(false)}>Cancelar</button><button className="primary-action" type="button" disabled={action === "leaving"} onClick={() => void leave()}>{action === "leaving" ? "Saliendo…" : "Abandonar liga"}</button></div></Dialog>
    {message && <p className={styles.feedback} role="status" aria-live="polite">{message}</p>}
  </section>;
}
