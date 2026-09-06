import { redirect } from "next/navigation";
export default async function LeaguePage({params}:{params:Promise<{leagueId:string}>}){
  redirect(`/app/ligas?league=${encodeURIComponent((await params).leagueId)}`);
}
