import { AuthForm } from "../auth/auth-form";
import { requestPasswordReset } from "../auth/actions";
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = (await searchParams).error;
  return <AuthForm mode="reset" action={requestPasswordReset} initialMessage={error === "invalid_link" ? "El enlace ha caducado o no es válido. Solicita uno nuevo." : undefined} />;
}
