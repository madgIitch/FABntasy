import { AuthForm } from "../auth/auth-form";
import { updatePassword } from "../auth/actions";
export default function UpdatePasswordPage() { return <AuthForm mode="update" action={updatePassword} />; }
