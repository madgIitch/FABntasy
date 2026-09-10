"use client";
import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./home-dashboard.module.css";

export function DashboardRefresh({live,updatedAt}:{live:boolean;updatedAt:string}){
  const router=useRouter(),refreshing=useRef(false),[pending,startTransition]=useTransition();
  const refresh=useCallback(()=>{if(refreshing.current)return;refreshing.current=true;startTransition(()=>router.refresh());window.setTimeout(()=>{refreshing.current=false},2000)},[router]);
  useEffect(()=>{if(!live)return;const timer=window.setInterval(()=>{if(document.visibilityState==="visible")refresh()},45000);return()=>window.clearInterval(timer)},[live,refresh]);
  return <footer className={styles.updated}><time dateTime={updatedAt}>Portada actualizada {new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Madrid"}).format(new Date(updatedAt))}</time><button type="button" onClick={refresh} disabled={pending}>{pending?"Actualizando…":"Actualizar"}</button></footer>
}
