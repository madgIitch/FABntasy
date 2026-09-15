"use client";
import { useCallback, useEffect, useState } from "react";
import { NOTIFICATION_GROUPS, type NotificationIntent } from "../../../../../packages/domain/notifications";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type DeviceState = "pending"|"unsupported"|"granted-unsubscribed"|"denied"|"subscribed"|"unsubscribed"|"error"|"recovered";
const LABELS:Record<NotificationIntent,string>={MARKET_PRICE:"Cambios importantes de precio",MARKET_OFFER:"Ofertas recibidas",MARKET_OUTBID:"Pujas superadas",MARKET_SOLD:"Jugador vendido",TEAM_INJURY:"Lesiones",TEAM_CUTOFF:"Aviso antes del cierre",TEAM_LINEUP:"Recordatorio de alineación",LEAGUE_CLAUSE:"Clausulazos",LEAGUE_ACTIVITY:"Actividad importante",LEAGUE_MESSAGE:"Mensajes",ROUND_START:"Comienzo de mis partidos",ROUND_RESULT:"Resultados"};
const STATE_LABEL:Record<DeviceState,string>={pending:"Comprobando…",unsupported:"No compatible","granted-unsubscribed":"Permiso concedido, sin suscripción",denied:"Permiso denegado",subscribed:"Suscrito",unsubscribed:"Desuscrito",error:"Error de configuración",recovered:"Recuperado"};
const decode=(value:string)=>{const pad="=".repeat((4-value.length%4)%4);return Uint8Array.from(atob((value+pad).replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0))};
const DEVICE_STORAGE_KEY="canastio.push.device.v1";
export function currentPushDeviceId(){let id=localStorage.getItem(DEVICE_STORAGE_KEY);if(!id){id=crypto.randomUUID();localStorage.setItem(DEVICE_STORAGE_KEY,id)}return id}

export async function revokeCurrentPushDevice(){
 const deviceId=localStorage.getItem(DEVICE_STORAGE_KEY);
 if(!deviceId)return;
 let endpoint:string|undefined;
 if("serviceWorker" in navigator){const registration=await navigator.serviceWorker.ready;endpoint=(await registration.pushManager?.getSubscription())?.endpoint}
 const response=await fetch("/api/notifications",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({deviceId,endpoint}),keepalive:true});
 if(!response.ok)throw new Error("PUSH_DEVICE_REVOCATION_FAILED");
}

export async function saveNotificationPreference(intent:NotificationIntent,enabled:boolean,fetcher:typeof fetch=fetch){
 const response=await fetcher("/api/notifications",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({intent,enabled})});
 if(!response.ok)throw new Error("PREFERENCE_UPDATE_FAILED");
}

export function PwaSettings({vapidPublicKey,section="all"}:{vapidPublicKey:string;section?:"all"|"install"|"notifications"}){
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[standalone,setStandalone]=useState(false),[ios,setIos]=useState(false),[deviceState,setDeviceState]=useState<DeviceState>("pending"),[prefs,setPrefs]=useState<Record<string,boolean>>({}),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const refresh=useCallback(async(recovered=false)=>{
  if(!("Notification" in window)||!("serviceWorker" in navigator)||!("PushManager" in window)||!vapidPublicKey){setDeviceState("unsupported");return}
  if(Notification.permission==="denied"){setDeviceState("denied");return}
  const registration=await navigator.serviceWorker.ready,local=await registration.pushManager.getSubscription(),deviceId=currentPushDeviceId();
  const response=await fetch(`/api/notifications?deviceId=${encodeURIComponent(deviceId)}`),json=response.ok?await response.json():null;
  if(json?.data?.preferences)setPrefs(json.data.preferences);
  if(!response.ok){setDeviceState("error");return}
  if(json.data.device.requiresResubscribe){setDeviceState("error");setMessage("La clave de envío cambió. Vuelve a activar este dispositivo.");return}
  const registered=Boolean(json.data.device.registered);
  setDeviceState(recovered&&local&&registered?"recovered":local&&registered?"subscribed":Notification.permission==="granted"?"granted-unsubscribed":local?"error":"unsubscribed");
 },[vapidPublicKey]);
 useEffect(()=>{const nav=navigator as Navigator&{standalone?:boolean};setStandalone(matchMedia("(display-mode: standalone)").matches||nav.standalone===true);setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));void refresh().catch(()=>setDeviceState("error"));const capture=(e:Event)=>{e.preventDefault();setPrompt(e as InstallPrompt)};window.addEventListener("beforeinstallprompt",capture);return()=>window.removeEventListener("beforeinstallprompt",capture)},[refresh]);
 async function install(){if(!prompt)return;await prompt.prompt();await prompt.userChoice;setPrompt(null)}
 async function ensureSubscription(){if(!("serviceWorker" in navigator)||!("PushManager" in window)||!vapidPublicKey)return false;const result=await Notification.requestPermission();if(result!=="granted"){setDeviceState(result==="denied"?"denied":"unsubscribed");return false}const registration=await navigator.serviceWorker.ready;let subscription=await registration.pushManager.getSubscription();if(deviceState==="error"&&subscription){await subscription.unsubscribe();subscription=null}subscription??=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(vapidPublicKey)});const response=await fetch("/api/notifications",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({deviceId:currentPushDeviceId(),subscription:subscription.toJSON()})});if(!response.ok){setDeviceState("error");return false}await refresh(deviceState==="error"||deviceState==="unsubscribed");return true}
 async function enableDevice(){setBusy(true);setMessage("");try{if(!await ensureSubscription())setMessage(Notification.permission==="denied"?"Permite las notificaciones en los ajustes del sitio.":"No se pudo registrar este dispositivo.")}catch{setDeviceState("error");setMessage("No se pudo registrar este dispositivo. Comprueba los permisos y reintenta.")}finally{setBusy(false)}}
 async function disableDevice(){setBusy(true);setMessage("");try{const registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();await revokeCurrentPushDevice();await subscription?.unsubscribe();setDeviceState("unsubscribed")}catch{setDeviceState("error");setMessage("No se pudo desactivar este dispositivo.")}finally{setBusy(false)}}
 async function testDevice(){setBusy(true);setMessage("");try{const response=await fetch("/api/notifications/test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({deviceId:currentPushDeviceId()})});if(!response.ok)throw new Error();setMessage("Prueba enviada. Puedes cerrar la PWA para verificar la recepción.")}catch{setMessage("No se pudo enviar la prueba. Espera y vuelve a intentarlo.")}finally{setBusy(false)}}
 async function toggle(intent:NotificationIntent){const next=!prefs[intent];setBusy(true);setMessage("");try{await saveNotificationPreference(intent,next);setPrefs(current=>({...current,[intent]:next}))}catch{setMessage("No pudimos guardar el cambio. Inténtalo de nuevo.")}finally{setBusy(false)}}
 const supported=deviceState!=="unsupported",active=deviceState==="subscribed"||deviceState==="recovered";
 return <>
  {section!=="notifications"&&!standalone&&(prompt||ios)?<section className="profile-group" aria-labelledby="install-title"><div className="profile-group-heading"><h2 id="install-title">{ios?"Añadir a pantalla de inicio":"Instalar Canastio"}</h2></div><div className="profile-list pwa-action"><div><strong>Acceso rápido desde tu dispositivo</strong><small>{ios?"En Safari, pulsa Compartir → Añadir a pantalla de inicio.":"Instala Canastio para abrirlo como una aplicación."}</small></div>{prompt?<button className="primary-action" onClick={install}>Instalar</button>:null}</div></section>:null}
  {section!=="install"?<section className="profile-group" aria-labelledby="notifications-title"><div className="device-status"><span><small>Estado del dispositivo</small><strong>{STATE_LABEL[deviceState]}</strong></span>{supported&&!active&&deviceState!=="denied"?<button className="primary-action" disabled={busy||deviceState==="pending"} onClick={()=>void enableDevice()}>{deviceState==="error"?"Volver a activar":"Permitir notificaciones"}</button>:null}{active?<><button disabled={busy} onClick={()=>void testDevice()}>Enviar prueba</button><button disabled={busy} onClick={()=>void disableDevice()}>Desactivar dispositivo</button></>:null}</div><p className="settings-help">El permiso del navegador, este dispositivo y tus preferencias se gestionan por separado.</p>{deviceState==="denied"?<p className="settings-status">Actívalas desde los permisos del sitio; Canastio no puede cambiar este ajuste.</p>:null}{message?<p className="form-message" role="status">{message}</p>:null}
  {Object.entries(NOTIFICATION_GROUPS).map(([group,intents])=><div key={group} className="notification-group"><h3>{group}</h3><div className="profile-list">{intents.map(intent=><label className="notification-row" key={intent}><span>{LABELS[intent]}</span><input type="checkbox" role="switch" checked={Boolean(prefs[intent])} disabled={busy||!supported||deviceState==="denied"||deviceState==="pending"} onChange={()=>void toggle(intent)}/></label>)}</div></div>)}</section>:null}
 </>;
}
