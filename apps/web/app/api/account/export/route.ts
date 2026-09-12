import { createClient } from "../../../../src/lib/supabase/server";
import { exportOwnAccount } from "../../../../src/server/account-privacy";

export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  const data = await exportOwnAccount(user.id);
  if (!data) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  return Response.json(data, { headers: { "Content-Disposition": `attachment; filename="canastio-export.json"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
