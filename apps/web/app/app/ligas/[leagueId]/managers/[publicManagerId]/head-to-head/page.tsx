import { HeadToHead } from "../../../../../../../src/components/head-to-head";

export default async function Page({ params }: { params: Promise<{ leagueId: string; publicManagerId: string }> }) {
  const value = await params;
  return <HeadToHead leagueId={value.leagueId} publicManagerId={value.publicManagerId} />;
}
