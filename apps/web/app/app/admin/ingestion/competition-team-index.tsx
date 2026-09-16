"use client";
import { useRef, useState } from "react";
import type { CompetitionTeamIndex } from "../../../../src/server/ingestion-admin";
import styles from "./competition-team-index.module.css";

const WARNING: Partial<Record<CompetitionTeamIndex["coverageStatus"], string>> = {
  PARTIAL: "Cobertura parcial: se muestra el último snapshot disponible.",
  STALE: "Datos desactualizados: se muestra el último snapshot válido.",
  NOT_SYNCED: "Los equipos todavía no se han sincronizado.",
  FAILED: "La última sincronización falló. Se conservan los últimos datos válidos si existen.",
};
type Props = { catalogId: string; initial: CompetitionTeamIndex | null };
export function CompetitionTeamIndex({ catalogId, initial }: Props) {
  const [open, setOpen] = useState(false), [data, setData] = useState(initial), [loading, setLoading] = useState(false), [error, setError] = useState(false);
  const button = useRef<HTMLButtonElement>(null), panelId = `team-index-${catalogId}`;
  async function load() {
    setLoading(true); setError(false);
    try {
      const response = await fetch("/api/admin/ingestion/team-index", { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("INDEX_UNAVAILABLE");
      const body = await response.json() as { data: { competitions: CompetitionTeamIndex[] } };
      const current = body.data.competitions.find(item => item.catalogId === catalogId);
      if (!current) throw new Error("INDEX_UNAVAILABLE");
      setData(current);
    } catch { setError(true); }
    finally { setLoading(false); button.current?.focus(); }
  }
  async function toggle() { const next = !open; setOpen(next); if (next) await load(); }
  const count = (value: number | null | undefined, label: string) => value === null || value === undefined ? `${label}: sin datos` : `${value} ${label}`;
  return <div className={styles.root}>
    <p className={styles.summary}><span>{count(data?.teamCount,"equipos")}</span><span>{count(data?.playerRegistrationCount,"inscripciones")}</span><span>Estado: {data?.coverageStatus??"NOT_SYNCED"}</span></p>
    <button ref={button} type="button" className={styles.toggle} aria-expanded={open} aria-controls={panelId} onClick={()=>void toggle()}>{open?"Ocultar índice de equipos":"Ver índice de equipos"}</button>
    {open?<div id={panelId} aria-label="Índice de equipos e inscripciones" aria-busy={loading}>
      {loading?<p role="status">Cargando índice…</p>:error?<p className={styles.error} role="alert">No se pudo cargar el índice.<button className={styles.retry} type="button" onClick={()=>void load()}>Reintentar</button></p>:data?<>
        {WARNING[data.coverageStatus]?<p className={styles.warning} role="status">{WARNING[data.coverageStatus]}</p>:null}
        {data.coverageStatus==="COMPLETE"&&data.teamCount===0?<p className={styles.empty}>Sin equipos inscritos en esta competición.</p>:null}
        {data.teams.length?<ul className={styles.list} aria-label="Equipos"><li className={styles.row} aria-hidden="true"><span>Equipo</span><strong>Inscripciones</strong></li>{data.teams.map(team=><li className={styles.row} key={team.teamId}><span>{team.teamName}</span><strong>{team.playerRegistrationCount} inscripciones</strong></li>)}</ul>:null}
        <small>Calculado <time dateTime={data.calculatedAt}>{new Date(data.calculatedAt).toLocaleString("es-ES")}</time>{data.teamsLastSyncedAt?<> · equipos sincronizados <time dateTime={data.teamsLastSyncedAt}>{new Date(data.teamsLastSyncedAt).toLocaleString("es-ES")}</time></>:null}{data.playersLastSyncedAt?<> · jugadores sincronizados <time dateTime={data.playersLastSyncedAt}>{new Date(data.playersLastSyncedAt).toLocaleString("es-ES")}</time></>:null}</small>
      </>:null}
    </div>:null}
  </div>;
}
