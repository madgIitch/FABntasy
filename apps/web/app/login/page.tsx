import { AuthForm } from "../auth/auth-form";
import { login } from "../auth/actions";
export default function LoginPage() { return <AuthForm mode="login" action={login} />; }
