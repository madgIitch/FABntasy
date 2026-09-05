import { AuthForm } from "../auth/auth-form";
import { updatePassword } from "../auth/actions";
import { redirect } from "next/navigation";
import { createClient } from "../../src/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/recuperar-clave?error=invalid_link");
  return <AuthForm mode="update" action={updatePassword} />;
}
