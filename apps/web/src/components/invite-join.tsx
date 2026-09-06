"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function InviteJoin({token}:{token:string}){const router=useRouter();const [message,setMessage]=useState("");async function join(){const r=await fetch("/api/fantasy/leagues/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});const b=await r.json();if(r.status===401){router.push(`/login?next=${encodeURIComponent(`/liga/${token}`)}`);return}if(!r.ok){setMessage(b.error?.code??"No se pudo unir");return}router.push("/app/ligas");router.refresh()}return <><button className="primary-action" onClick={()=>void join()}>Unirme a la liga <span>↗</span></button>{message&&<p className="form-message error" role="alert">{message}</p>}</>}
