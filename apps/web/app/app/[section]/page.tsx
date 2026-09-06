import { notFound } from "next/navigation";
const sections: Record<string, [string, string]> = {
  jornada: ["Jornada", "Aquí verás el estado de la jornada, tus puntos y los partidos en juego."],
  "mi-equipo": ["Mi equipo", "Aquí construirás tu plantilla y elegirás el quinteto de cada jornada."],
  mercado: ["Mercado", "Los fichajes se habilitarán cuando estén disponibles jugadores y precios."],
  ligas: ["Ligas", "Pronto podrás crear ligas privadas y competir con tu grupo."],
  jugadores: ["Jugadores", "El explorador mostrará estadísticas sincronizadas desde nuestra base de datos."],
  perfil: ["Perfil", "Gestiona tu identidad y preferencias de Canastio."],
};
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params; const content = sections[section]; if (!content) notFound();
  return <main className="app-main"><header className="workspace-header"><div><p className="eyebrow">Canastio</p><h1>{content[0]}</h1></div></header><section className="empty-state"><span aria-hidden="true">◎</span><h2>Todo listo para empezar</h2><p>{content[1]}</p><small>No mostramos datos de ejemplo para no confundirlos con información real.</small></section></main>;
}
