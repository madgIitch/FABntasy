import { createClient } from "../../../../src/lib/supabase/server";
import { findDiscoverableProfiles } from "../../../../src/server/user-profile";

export async function GET(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  return Response.json({ schemaVersion: "username-discovery.v1", data: await findDiscoverableProfiles(user.id, new URL(request.url).searchParams.get("q") ?? "") }, { headers: { "Cache-Control": "no-store" } });
}
