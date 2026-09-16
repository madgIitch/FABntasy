"use client";

import { useState } from "react";
import styles from "./league-detail.module.css";
import { Dialog } from "./ui/dialog";

type ActionState = "idle" | "copying" | "saving" | "leaving";

export function LeagueDetailActions({ leagueId, leagueCode, isOwner, showInvitation = true }: { leagueId: string; leagueCode: string; isOwner: boolean; showInvitation?: boolean }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [action, setAction] = useState<ActionState>("idle");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function copyCode() {
    setAction("copying");
    try {
      await navigator.clipboard.writeText(leagueCode);
      setMessage("Código copiado. Ya puedes compartirlo.");
    } catch {
      setMessage("No se pudo copiar. Mantén pulsado el código para seleccionarlo.");
    } finally {
      setAction("idle");
    }
  }

  async function updatePassword() {
    setAction("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/fantasy/leagues/${leagueId}/credentials`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json();
      if (!response.ok) return setMessage(body.error?.code ?? "No se pudo cambiar la contraseña.");
      setPassword("");
      setMessage("Contraseña actualizada.");
    } catch {
      setMessage("Sin conexión. No se ha cambiado la contraseña.");
    } finally {
      setAction("idle");
    }
  }

  async function leave() {
    setAction("leaving");
    setMessage("");
    try {
      const response = await fetch(`/api/fantasy/leagues/${leagueId}/leave`, { method: "POST" });
      if (response.ok) location.href = "/app/ligas";
      else setMessage((await response.json()).error?.code ?? "No se pudo abandonar la liga.");
    } catch {
      setMessage("Sin conexión. Sigues dentro de la liga.");
    } finally {
      setAction("idle");
      setConfirmLeave(false);
    }
  }

  return <section className={styles.access} aria-labelledby="league-access-title">
    <div className={styles.intro}>
      <div className={styles.introHeading}>
        <p className={styles.eyebrow}>{showInvitation ? "Acceso" : "Administración"}</p>
        <h3 className={styles.title} id="league-access-title">{showInvitation ? "Invita a tu liga" : isOwner ? "Gestiona tu liga" : "Tu participación"}</h3>
      </div>
      <p className={styles.introHint}>{showInvitation ? "Comparte el código y la contraseña por separado." : isOwner ? "Controla las credenciales de acceso." : "Gestiona tu pertenencia a esta liga."}</p>
    </div>

    {showInvitation && <div className={styles.codeRow}>
      <div className={styles.codeBlock}>
        <span className={styles.fieldLabel}>Código de liga</span>
        <strong className={styles.codeValue}>{leagueCode}</strong>
      </div>
      <button className={styles.copyButton} aria-label="Copiar código de liga" disabled={action !== "idle"} onClick={() => void copyCode()}>
        <span className={styles.buttonLabel}>{action === "copying" ? "Copiando…" : "Copiar código"}</span>
        <b className={styles.buttonIcon} aria-hidden="true">▣</b>
      </button>
    </div>}

    {isOwner ? <div className={styles.security}>
      <div className={styles.securityCopy}>
        <span className={styles.eyebrow}>Seguridad</span>
        <strong className={styles.securityTitle}>Clave de acceso</strong>
        <small className={styles.securityHint}>Los nuevos miembros necesitarán esta clave. Los miembros actuales no se verán afectados.</small>
      </div>
      {showPassword ? <div className={styles.passwordForm}><label className={styles.fieldLabel} htmlFor="league-password">Nueva clave</label><input className={styles.passwordInput} id="league-password" type="password" autoComplete="new-password" minLength={6} maxLength={72} placeholder="6 caracteres como mínimo" value={password} onChange={event => setPassword(event.target.value)} /><button className={styles.saveButton} disabled={password.length < 6 || action !== "idle"} onClick={() => void updatePassword()}><span className={styles.buttonLabel}>{action === "saving" ? "Guardando…" : "Actualizar clave"}</span><span className={styles.buttonIcon} aria-hidden="true">→</span></button></div> : <button className={styles.saveButton} type="button" onClick={() => setShowPassword(true)}>Cambiar clave de acceso <span className={styles.buttonIcon} aria-hidden="true">→</span></button>}
    </div> : <button className={styles.leaveButton} disabled={action !== "idle"} onClick={() => setConfirmLeave(true)}>{action === "leaving" ? "Saliendo…" : "Abandonar liga"}</button>}

    <Dialog open={confirmLeave} title="¿Abandonar esta liga?" onClose={() => setConfirmLeave(false)}><p>Dejarás de participar en esta liga. La operación se comprobará antes de confirmar la salida.</p><div><button disabled={action === "leaving"} onClick={() => setConfirmLeave(false)}>Cancelar</button><button className="primary-action" disabled={action === "leaving"} onClick={() => void leave()}>{action === "leaving" ? "Saliendo…" : "Abandonar liga"}</button></div></Dialog>

    {message && <p className={styles.feedback} role="status" aria-live="polite">{message}</p>}
  </section>;
}
