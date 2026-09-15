"use client";

import { useEffect, useRef, useState } from "react";
import { publicInitials } from "../../../../packages/domain/manager-profile";
import styles from "./manager-profile.module.css";

type ProfileData = Awaited<ReturnType<typeof import("../server/manager-profile").getManagerProfile>>;
const credits = (value: number) => `${new Intl.NumberFormat("es-ES").format(value)} cr`;

export function ManagerProfile({ leagueId, publicManagerId }: { leagueId: string; publicManagerId: string }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [failed, setFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/managers/${encodeURIComponent(publicManagerId)}`, { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); setData((await response.json()).data); })
      .catch(() => setFailed(true));
  }, [leagueId, publicManagerId]);
  useEffect(() => { if (data || failed) heading.current?.focus(); }, [data, failed]);

  const back = `/app/ligas?league=${encodeURIComponent(leagueId)}&tab=members`;
  if (failed) return <main className={styles.page}><a className={styles.back} href={back}>← Volver a Liga</a><h1 ref={heading} tabIndex={-1}>Perfil no disponible</h1><p role="alert">La membresía puede haber cambiado. Vuelve a la liga e inténtalo de nuevo.</p></main>;
  if (!data) return <main className={styles.loading} role="status">Cargando perfil…</main>;

  const grouped = Object.values(data.awards.reduce<Record<string, { award: ProfileData["awards"][number]; count: number; rounds: number[] }>>((result, award) => {
    const item = result[award.type] ??= { award, count: 0, rounds: [] };
    item.count++;
    if (award.roundNumber !== null) item.rounds.push(award.roundNumber);
    return result;
  }, {}));

  async function share() {
    const text = [`Canastio · ${data!.profile.name}`, data!.profile.teamName, data!.profile.competitionName, `Posición: ${data!.metrics.position ?? "—"}`, `Valor: ${credits(data!.metrics.rosterValue)}`, `Mejor jornada: ${data!.bestRound?.toFixed(1) ?? "—"} pts`].join("\n");
    try {
      const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 630;
      const context = canvas.getContext("2d"); if (!context) throw new Error();
      context.fillStyle = "#0d251c"; context.fillRect(0, 0, 1200, 630); context.fillStyle = "#fff"; context.font = "700 58px system-ui";
      text.split("\n").forEach((line, index) => context.fillText(line, 72, 110 + index * 78));
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png")); if (!blob) throw new Error();
      const file = new File([blob], "canastio-perfil.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Perfil Canastio" }); setNotice("Perfil compartido."); return; }
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = file.name; link.click(); URL.revokeObjectURL(link.href); setNotice("Tarjeta descargada.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") { setNotice("Compartir cancelado."); return; }
      try { await navigator.clipboard.writeText(text); setNotice("Resumen copiado."); } catch { setNotice("No se pudo compartir."); }
    }
  }

  return <main className={styles.page}>
    <a className={styles.back} href={back}>← Volver a Liga</a>
    <header className={styles.hero}>
      {data.profile.avatarUrl && !avatarFailed ? <img src={data.profile.avatarUrl} width="112" height="112" alt={`Avatar de ${data.profile.name}`} onError={() => setAvatarFailed(true)} /> : <span className={styles.avatar} role="img" aria-label={`Iniciales de ${data.profile.name}`}>{publicInitials(data.profile.name)}</span>}
      <div><p>{data.profile.leagueName}</p><h1 ref={heading} tabIndex={-1}>{data.profile.name}</h1><span>{data.profile.teamName} · {data.profile.username}</span></div>
    </header>
    <section><h2>Temporada actual</h2><dl className={styles.metrics}><div><dt>Posición</dt><dd>{data.metrics.position ?? "—"}</dd></div><div><dt>Valor de plantilla</dt><dd>{credits(data.metrics.rosterValue)}</dd></div><div><dt>Puntos</dt><dd>{data.metrics.totalPoints?.toFixed(1) ?? "—"}</dd></div><div><dt>Racha MVP</dt><dd>{data.streak.length}</dd></div></dl></section>
    <section><h2>Trofeos y logros</h2>{grouped.length ? <ul className={styles.trophies}>{grouped.map(({ award, count, rounds }) => <li key={award.type}><img src={award.icon.src} width="96" height="96" alt={`${award.icon.label} de ${data.profile.name}`} /><strong>{award.icon.label}</strong>{award.icon.repeatable && <b>×{count}</b>}<small>{rounds.length ? `Jornadas ${rounds.join(", ")}` : "Temporada actual"}</small></li>)}</ul> : <p>Aún no hay trofeos publicados.</p>}</section>
    <section><h2>Histórico</h2>{data.history.length ? <ol className={styles.history}>{data.history.map((item) => <li key={`${item.roundNumber}-${item.revision}`}><span>Jornada {item.roundNumber}</span><strong>{item.points?.toFixed(1) ?? "—"} pts</strong></li>)}</ol> : <p>No hay jornadas publicadas.</p>}</section>
    <nav className={styles.actions} aria-label="Acciones del perfil"><a href={`/app/ligas/${leagueId}/managers/${encodeURIComponent(publicManagerId)}/head-to-head`}>Head-to-Head</a><button disabled={!data.rivalryAvailable}>Rivalidad</button><button onClick={() => void share()}>Compartir perfil</button></nav>
    <p role="status" aria-live="polite">{notice}</p>
  </main>;
}
