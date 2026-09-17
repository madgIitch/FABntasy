import { db } from "../../../../../src/server/db";
import { LeagueManagementForm } from "../../../../../src/components/league-management-form";

export default async function CreateLeaguePage() {
  const seasons = await db.competitionSeason.findMany({ where: { fantasyEnabled: true }, include: { competition: true }, orderBy: { createdAt: "desc" } });
  return <main className="app-main profile-page"><header className="workspace-header profile-header"><div><p className="eyebrow">Mis ligas</p><h1>Crear liga</h1><p>Configura un espacio nuevo para tu grupo.</p></div></header><LeagueManagementForm mode="create" seasons={seasons.map((season) => ({ id: season.id, label: `${season.competition.name}${season.name ? ` · ${season.name}` : ""}` }))} /></main>;
}
