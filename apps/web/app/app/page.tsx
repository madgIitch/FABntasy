import { redirect } from "next/navigation";
import { HomeDashboard } from "../../src/components/home-dashboard";
import { createClient } from "../../src/lib/supabase/server";
import { getHomeDashboard } from "../../src/server/home-dashboard";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ league?: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");
  const { league } = await searchParams;
  return <HomeDashboard data={await getHomeDashboard(user.id, league)} />;
}
