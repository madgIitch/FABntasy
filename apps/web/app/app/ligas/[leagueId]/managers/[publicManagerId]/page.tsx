import { ManagerProfile } from "../../../../../../src/components/manager-profile";

export default async function Page({ params }: { params: Promise<{ leagueId: string; publicManagerId: string }> }) {
  const value = await params;
  return <ManagerProfile leagueId={value.leagueId} publicManagerId={value.publicManagerId} />;
}
