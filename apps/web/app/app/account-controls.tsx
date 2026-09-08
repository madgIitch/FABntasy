"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { logout } from "../auth/actions";

export function AccountAvatar({ imageUrl, initial }: { imageUrl: string | null; initial: string }) {
  return <Link className={`account-avatar${imageUrl ? " has-image" : ""}`} href="/app/perfil" aria-label="Abrir mi perfil" style={imageUrl ? { backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})` } : undefined}><span aria-hidden="true">{initial}</span></Link>;
}

export function LogoutControl() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button className="logout-button" type="button" onClick={() => dialog.current?.showModal()}>Cerrar sesión</button>
    <dialog className="confirm-dialog" aria-labelledby={titleId} ref={dialog} onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <form method="dialog" className="confirm-dialog-body">
        <p className="eyebrow">Cuenta</p><h2 id={titleId}>¿Cerrar sesión?</h2><p>Tendrás que volver a identificarte para acceder a tu cuenta.</p>
        <div><button type="submit">Cancelar</button><button formAction={logout} className="primary-action">Cerrar sesión</button></div>
      </form>
    </dialog>
  </>;
}
