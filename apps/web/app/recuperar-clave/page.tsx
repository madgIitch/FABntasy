import { AuthForm } from "../auth/auth-form";
import { requestPasswordReset } from "../auth/actions";
export default function ResetPage() { return <AuthForm mode="reset" action={requestPasswordReset} />; }
