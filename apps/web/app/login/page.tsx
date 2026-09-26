import { AuthForm } from "../auth/auth-form";
import { login } from "../auth/actions";
import { safeNextPath } from "../auth/safe-redirect";
import { cookies } from "next/headers";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { const { next } = await searchParams; const saved = (await cookies()).get("league_invite_next")?.value; return <AuthForm mode="login" action={login} next={safeNextPath(next ?? saved ?? null)} />; }
