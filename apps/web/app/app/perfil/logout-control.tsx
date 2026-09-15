"use client";

import { useId, useRef, useState } from "react";
import { logout } from "../../auth/actions";
import { revokeCurrentPushDevice } from "./pwa-settings";

export function ProfileLogoutControl(){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId(),[busy,setBusy]=useState(false);
 async function confirmLogout(){
  setBusy(true);
  try{await revokeCurrentPushDevice()}catch{/* Logout must remain available when Push is degraded. */}
  await logout();
 }
 return <>
  <button className="logout-button" type="button" onClick={()=>dialog.current?.showModal()}>Cerrar sesión</button>
  <dialog className="confirm-dialog" aria-labelledby={titleId} ref={dialog} onClick={event=>{if(event.target===dialog.current)dialog.current.close()}}>
   <form method="dialog" className="confirm-dialog-body">
    <p className="eyebrow">Cuenta</p><h2 id={titleId}>¿Cerrar sesión?</h2><p>Se desactivarán las notificaciones únicamente en este dispositivo.</p>
    <div><button type="submit" disabled={busy}>Cancelar</button><button type="button" disabled={busy} onClick={()=>void confirmLogout()} className="primary-action">{busy?"Cerrando…":"Cerrar sesión"}</button></div>
   </form>
  </dialog>
 </>;
}
