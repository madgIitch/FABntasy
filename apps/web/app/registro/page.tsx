import { AuthForm } from "../auth/auth-form";
import { register } from "../auth/actions";
import { safeNextPath } from "../auth/safe-redirect";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { const { next } = await searchParams; return <AuthForm mode="register" action={register} next={safeNextPath(next ?? null)} />; }
