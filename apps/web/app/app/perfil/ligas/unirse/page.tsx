import { LeagueManagementForm } from "../../../../../src/components/league-management-form";

export default function JoinLeaguePage() {
  return <main className="app-main profile-page"><header className="workspace-header profile-header"><div><p className="eyebrow">Mis ligas</p><h1>Unirme a una liga</h1><p>Introduce el código y la contraseña que te ha compartido su propietario.</p></div></header><LeagueManagementForm mode="join" /></main>;
}
