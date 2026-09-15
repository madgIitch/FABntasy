"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./head-to-head.module.css";

type Manager = { name: string; points: number; roundsWon: number; averagePosition: number; rosterValue: number; record: { wins: number; draws: number; losses: number } };
type Comparison =
  | { comparable: false; reason: string }
  | { comparable: true; roundRange: { from: number; to: number; count: number }; left: Manager; right: Manager; rivalry: { reason: string | null; score: string; difference: number } };

const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const credits = (value: number) => `${new Intl.NumberFormat("es-ES").format(value)} cr`;

export function HeadToHead({ leagueId, publicManagerId }: { leagueId: string; publicManagerId: string }) {
  const [data, setData] = useState<Comparison | null>(null);
  const [failed, setFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const profile = `/app/ligas/${leagueId}/managers/${encodeURIComponent(publicManagerId)}`;

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/head-to-head?manager=${encodeURIComponent(publicManagerId)}`, { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); setData((await response.json()).data); })
      .catch(() => setFailed(true));
  }, [leagueId, publicManagerId]);
  useEffect(() => { if (data || failed) heading.current?.focus(); }, [data, failed]);

  if (!data && !failed) return <main className={styles.loading} role="status">Preparando comparativa…</main>;
  if (failed) return <main className={styles.page}><Link className={styles.back} href={profile}>← Volver al perfil</Link><section className={styles.empty}><span aria-hidden="true">⚠</span><p>Head-to-Head</p><h1 ref={heading} tabIndex={-1}>No pudimos cargar la comparativa</h1><p>Comprueba tu conexión o vuelve a intentarlo desde el perfil del manager.</p><Link className={styles.primary} href={profile}>Volver al perfil</Link></section></main>;
  if (!data!.comparable) return <main className={styles.page}><Link className={styles.back} href={profile}>← Volver al perfil</Link><section className={styles.empty}><span aria-hidden="true">VS</span><p>Head-to-Head</p><h1 ref={heading} tabIndex={-1}>Aún no hay datos que comparar</h1><p>{data!.reason} La comparativa aparecerá automáticamente cuando ambos tengáis resultados en una misma jornada.</p><div className={styles.emptyActions}><Link className={styles.primary} href="/app/jornada">Ver la jornada</Link><Link href={profile}>Volver al perfil</Link></div></section></main>;

  const comparison = data!;
  return <main className={styles.page}>
    <Link className={styles.back} href={profile}>← Volver al perfil</Link>
    <header className={styles.header}><p>Head-to-Head · Jornadas {comparison.roundRange.from}–{comparison.roundRange.to}</p><h1 ref={heading} tabIndex={-1}>{comparison.left.name} <span>vs</span> {comparison.right.name}</h1><small>{comparison.roundRange.count} jornadas compartidas</small></header>
    <section className={styles.score} aria-label="Balance histórico"><strong>{comparison.left.record.wins}</strong><span>{comparison.left.record.draws} empates</span><strong>{comparison.right.record.wins}</strong></section>
    <dl className={styles.metrics}>
      <Metric label="Puntos acumulados" left={number.format(comparison.left.points)} right={number.format(comparison.right.points)} />
      <Metric label="Posición media" left={number.format(comparison.left.averagePosition)} right={number.format(comparison.right.averagePosition)} />
      <Metric label="Valor de plantilla" left={credits(comparison.left.rosterValue)} right={credits(comparison.right.rosterValue)} />
    </dl>
    {comparison.rivalry.reason && <aside className={styles.rivalry}><p>Rivalidad activa</p><strong>{comparison.rivalry.reason}</strong><span>Diferencia total: {number.format(comparison.rivalry.difference)} pts</span></aside>}
  </main>;
}

function Metric({ label, left, right }: { label: string; left: string; right: string }) {
  return <div><dd>{left}</dd><dt>{label}</dt><dd>{right}</dd></div>;
}
