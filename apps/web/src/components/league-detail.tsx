"use client";

import { useState } from "react";

export function LeagueDetailActions({leagueId,leagueCode,isOwner}:{leagueId:string;leagueCode:string;isOwner:boolean}){
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");

  async function copyCode(){await navigator.clipboard?.writeText(leagueCode);setMessage("Código copiado");}
  async function updatePassword(){
    const response=await fetch(`/api/fantasy/leagues/${leagueId}/credentials`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({password})});
    const body=await response.json();
    if(!response.ok)return setMessage(body.error?.code??"No se pudo cambiar");
    setPassword("");setMessage("Contraseña actualizada");
  }
  async function leave(){const response=await fetch(`/api/fantasy/leagues/${leagueId}/leave`,{method:"POST"});if(response.ok)location.href="/app/ligas";else setMessage((await response.json()).error?.code??"No se pudo abandonar");}

  return <div className="quick-list"><button className="primary-action" onClick={()=>void copyCode()}>Copiar código <span>↗</span></button>{isOwner?<><input aria-label="Nueva contraseña de liga" type="password" autoComplete="new-password" minLength={6} maxLength={72} placeholder="Nueva contraseña" value={password} onChange={event=>setPassword(event.target.value)}/><button className="primary-action" disabled={password.length<6} onClick={()=>void updatePassword()}>Cambiar contraseña <span>→</span></button></>:<button className="logout-button" onClick={()=>void leave()}>Abandonar liga</button>}{message&&<p className="form-message" role="status">{message}</p>}</div>;
}
