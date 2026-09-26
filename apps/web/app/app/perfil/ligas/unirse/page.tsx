import { LeagueManagementForm } from "../../../../../src/components/league-management-form";

export default function JoinLeaguePage() {
  return <main className="app-main profile-page"><header className="workspace-header profile-header"><div><p className="eyebrow">Mis ligas</p><h1>Unirme a una liga</h1><p>Abre el enlace que te han compartido para ver la liga y confirmar tu entrada.</p></div></header><LeagueManagementForm mode="join" /></main>;
}
